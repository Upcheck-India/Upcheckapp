import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { PhotoLedgerService, type LedgerOwner } from './photo-ledger.service';

/** Minimal shape of a multer file — @types/multer is not installed. */
export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

/** Top-level key prefixes in the bucket, one per kind of photo. */
export type PhotoNamespace = 'health' | 'feedback' | 'avatars';

export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

/** 5 MB per image after the app's on-device compression. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * P4 (first half): 20 uploads / 10 min per caller, separate from the global
 * 120/window limit — a farmer logging 3 photos never notices, a script does.
 */
export const UPLOAD_THROTTLE = { default: { limit: 20, ttl: 600_000 } };

const SIGNED_URL_TTL_SECONDS = 3600;
// Every object key embeds a fresh uuid, so its bytes never change.
const CACHE_CONTROL = 'private, max-age=31536000, immutable';

/**
 * Codes a client maps to localised copy (P13). Kept small and stable —
 * these are the only photo failures the app has to translate; anything else
 * falls back to a generic "could not save this photo" message.
 */
export type PhotoErrorCode =
  | 'IMAGE_TOO_LARGE'
  | 'UNSUPPORTED_TYPE'
  | 'STORAGE_UNCONFIGURED'
  | 'AVATAR_NOT_MIGRATED'
  | 'STORAGE_FULL';

export function photoError(
  statusCode: number,
  code: PhotoErrorCode,
  message: string,
) {
  return { statusCode, code, message };
}

type SniffedType = 'jpeg' | 'png' | 'webp' | 'heic';
const HEIC_BRANDS = new Set([
  'heic',
  'heix',
  'heim',
  'heis',
  'hevc',
  'hevx',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
]);

/**
 * P5: decide the image type from its BYTES, never the client-declared
 * `mimetype` header — a text/script body sent with `Content-Type:
 * image/jpeg` must not pass. Signature-only (not a full decode); sharp still
 * has to succeed at actually decoding it below.
 */
export function sniffImageType(buf: Buffer): SniffedType | null {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP')
    return 'webp';
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp' && HEIC_BRANDS.has(buf.subarray(8, 12).toString('ascii')))
    return 'heic';
  return null;
}

/**
 * The thumbnail stored next to a photo: `<uuid>.webp` → `<uuid>.thumb.webp`.
 * Anything that is not .webp was stored as-is (sharp could not decode it) and
 * is its own thumbnail.
 */
export function thumbPathOf(path: string): string {
  return path.endsWith('.webp') ? path.replace(/\.webp$/, '.thumb.webp') : path;
}

/**
 * Re-encode for storage: EXIF orientation applied, fitted inside `max` px,
 * WebP. No withMetadata(): sharp drops EXIF/GPS/XMP by default, which is the
 * point (a pond photo's GPS is the farm's location).
 */
function encode(input: Buffer, max: number, quality: number): Promise<Buffer> {
  return sharp(input)
    .rotate()
    .resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

/**
 * The one place photos meet Cloudflare R2 (private bucket, S3 API).
 *
 * Callers own their path rules (farm-, user- or avatar-namespaced) and store
 * the returned PATH (`<owner>/<uuid>.webp`), never a URL; this maps it to the
 * key `<namespace>/<path>`. Null client when R2 env is missing: uploads 503,
 * reads degrade to [] — storage must never take a whole endpoint down.
 */
@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private readonly client: S3Client | null;
  private readonly bucket: string;

  constructor(
    config: ConfigService,
    // Optional so the storage layer still works (untracked) without it.
    @Optional() private readonly ledger?: PhotoLedgerService,
  ) {
    const accountId = config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucket = config.get<string>('R2_BUCKET') || 'upcheck-photos';
    this.client =
      accountId && accessKeyId && secretAccessKey
        ? new S3Client({
            region: 'auto',
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
            // Only send/verify the SDK's flexible checksums where S3 requires
            // them; R2's support for the newer defaults has been uneven.
            requestChecksumCalculation: 'WHEN_REQUIRED',
            responseChecksumValidation: 'WHEN_REQUIRED',
          })
        : null;
    if (!this.client) {
      this.logger.warn(
        'R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY missing — photo uploads are disabled.',
      );
    }
  }

  get configured(): boolean {
    return !!this.client;
  }

  /**
   * Validate, optimise and store one image under `<namespace>/<base>.*`.
   * Returns the stored path relative to the namespace, always `<base>.webp`.
   *
   * P5: the type is decided by SNIFFING THE BYTES, never the client's
   * `Content-Type` header, and a client-declared mime is never echoed into
   * `PutObjectCommand`. If sharp cannot decode bytes that do have a valid
   * image signature (e.g. this build has no HEIC/HEIF support), the upload
   * is refused rather than stored — storing unprocessed bytes would mean
   * trusting an unverified mime and keeping whatever metadata (GPS) they
   * carry, which is exactly the bug this closes. A photo stored here has
   * always been decoded, rotated and re-encoded, which is what strips EXIF.
   *
   * F2: with an `owner`, a cheap pool check runs BEFORE anything is stored
   * (a full account never uploads), then the `photo_objects` row is admitted
   * atomically per account after both objects land (`ledger.record`: lock,
   * re-sum, insert). If a concurrent upload took the last slot, or the ledger
   * write fails, the pair is deleted — STORAGE_FULL / 503 respectively — so
   * no object exists that the quota or the orphan sweep cannot see.
   */
  async putImage(
    namespace: PhotoNamespace,
    base: string,
    file: UploadedImage,
    owner?: LedgerOwner,
  ): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        photoError(503, 'STORAGE_UNCONFIGURED', 'Photo storage is not configured'),
      );
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException(photoError(400, 'UNSUPPORTED_TYPE', 'Empty file'));
    }
    if (file.size > MAX_IMAGE_BYTES || file.buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException(photoError(400, 'IMAGE_TOO_LARGE', 'Image is too large'));
    }
    if (owner) await this.ledger?.assertRoom(owner.ownerUserId);
    const sniffed = sniffImageType(file.buffer);
    if (!sniffed) {
      throw new BadRequestException(
        photoError(400, 'UNSUPPORTED_TYPE', `Unsupported image type: ${file.mimetype}`),
      );
    }

    let thumb: Buffer;
    let full: Buffer;
    try {
      [thumb, full] = await Promise.all([
        encode(file.buffer, 400, 70),
        encode(file.buffer, 1600, 76),
      ]);
    } catch (err: any) {
      this.logger.warn(
        `Could not decode a byte-valid ${sniffed} (${err?.message ?? err}); refusing rather than storing unverified/unstrippable bytes`,
      );
      throw new BadRequestException(
        photoError(400, 'UNSUPPORTED_TYPE', `Could not process image type: ${sniffed}`),
      );
    }

    const path = `${base}.webp`;
    const thumbPath = thumbPathOf(path);
    // P6: one write, or none. Thumb first, then full; a full-size failure
    // deletes the thumb rather than leaving an orphaned half-pair.
    await this.putObject(namespace, thumbPath, thumb, 'image/webp');
    try {
      await this.putObject(namespace, path, full, 'image/webp');
    } catch (err: any) {
      this.logger.error(`R2 full-size upload failed, cleaning up thumb: ${err?.message ?? err}`);
      await this.deleteKeys([`${namespace}/${thumbPath}`]).catch((cleanupErr: any) =>
        this.logger.error(
          `Could not clean up orphaned thumb ${namespace}/${thumbPath}: ${cleanupErr?.message ?? cleanupErr}`,
        ),
      );
      throw new ServiceUnavailableException('Could not store the image');
    }
    if (owner && this.ledger) {
      try {
        await this.ledger.record(namespace, path, owner, full.length, thumb.length);
      } catch (err: any) {
        // Lost the race for the last slot (atomic re-check in `record`), or
        // the ledger write failed: either way this pair must not stay behind.
        const full = err instanceof HttpException && (err.getResponse() as any)?.code === 'STORAGE_FULL';
        if (!full) {
          this.logger.error(`Ledger write failed for ${namespace}/${path}, removing the upload: ${err?.message ?? err}`);
        }
        await this.deleteImages(namespace, [path]).catch((cleanupErr: any) =>
          this.logger.error(`Could not clean up untracked ${namespace}/${path}: ${cleanupErr?.message ?? cleanupErr}`),
        );
        if (full) throw err;
        throw new ServiceUnavailableException('Could not store the image');
      }
    }
    return path;
  }

  private async putObject(
    namespace: PhotoNamespace,
    path: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    try {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: `${namespace}/${path}`,
          Body: body,
          ContentType: contentType,
          CacheControl: CACHE_CONTROL,
        }),
      );
    } catch (err: any) {
      this.logger.error(`R2 upload failed for ${namespace}/${path}: ${err?.message ?? err}`);
      throw new ServiceUnavailableException('Could not store the image');
    }
  }

  /**
   * Presigned 1h GET URLs for full images and thumbnails, both in the order of
   * `paths`. Signing is local (no network call per photo). Callers must have
   * filtered `paths` to what the viewer may see. Degrades to empty lists.
   */
  async sign(
    namespace: PhotoNamespace,
    paths: string[],
  ): Promise<{ full: string[]; thumb: string[] }> {
    const empty = { full: [], thumb: [] };
    if (!paths.length) return empty;
    if (!this.client) {
      this.logger.warn('R2 not configured; returning no photo URLs');
      return empty;
    }
    const url = (path: string) =>
      getSignedUrl(
        this.client!,
        new GetObjectCommand({ Bucket: this.bucket, Key: `${namespace}/${path}` }),
        { expiresIn: SIGNED_URL_TTL_SECONDS },
      );
    try {
      // F3: a photo past retention has no full-size object any more — hand
      // out the thumbnail as its "full" so no screen ever shows a broken image.
      const dropped = (await this.ledger?.droppedAmong(namespace, paths)) ?? new Set<string>();
      const [full, thumb] = await Promise.all([
        Promise.all(paths.map((p) => url(dropped.has(p) ? thumbPathOf(p) : p))),
        Promise.all(paths.map((p) => url(thumbPathOf(p)))),
      ]);
      return { full, thumb };
    } catch (err: any) {
      this.logger.warn(`Could not sign photos: ${err?.message ?? err}`);
      return empty;
    }
  }

  /** Delete stored images and their thumbnails. Throws on failure. */
  async deleteImages(namespace: PhotoNamespace, paths: string[]): Promise<void> {
    const keys = [...new Set(paths.flatMap((p) => [p, thumbPathOf(p)]))].map(
      (p) => `${namespace}/${p}`,
    );
    await this.deleteKeys(keys);
  }

  /**
   * F3 retention: delete ONLY the full-size object, keep its thumbnail.
   * Refuses a path that is its own thumbnail (non-.webp) — that would delete
   * the one copy that is meant to stay forever. Throws on failure.
   */
  async deleteFull(namespace: PhotoNamespace, path: string): Promise<void> {
    if (thumbPathOf(path) === path) {
      throw new Error(`Refusing retention delete of ${namespace}/${path}: it has no separate thumbnail`);
    }
    await this.deleteKeys([`${namespace}/${path}`]);
  }

  /** Delete every object under `<namespace>/<prefix>`. Throws on failure. */
  async deletePrefix(namespace: PhotoNamespace, prefix: string): Promise<void> {
    if (!this.client) {
      throw new ServiceUnavailableException('Photo storage is not configured');
    }
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${namespace}/${prefix}`,
          ContinuationToken: token,
        }),
      );
      await this.deleteKeys((page.Contents ?? []).map((o) => o.Key!).filter(Boolean));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }

  private async deleteKeys(keys: string[]): Promise<void> {
    if (!keys.length) return;
    if (!this.client) {
      throw new ServiceUnavailableException('Photo storage is not configured');
    }
    const res = await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if (res.Errors?.length) {
      throw new Error(`R2 delete failed for ${res.Errors.map((e) => e.Key).join(', ')}`);
    }
  }
}
