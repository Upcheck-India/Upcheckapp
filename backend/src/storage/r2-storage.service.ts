import {
  BadRequestException,
  Injectable,
  Logger,
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

const SIGNED_URL_TTL_SECONDS = 3600;
// Every object key embeds a fresh uuid, so its bytes never change.
const CACHE_CONTROL = 'private, max-age=31536000, immutable';

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

  constructor(config: ConfigService) {
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
   * Returns the stored path relative to the namespace (`<base>.webp`, or
   * `<base>.<original ext>` when sharp cannot decode the input, e.g. HEIC —
   * stored unchanged rather than failing the farmer's upload).
   */
  async putImage(
    namespace: PhotoNamespace,
    base: string,
    file: UploadedImage,
  ): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('Photo storage is not configured');
    }
    if (!file?.buffer?.length) throw new BadRequestException('Empty file');
    if (!ALLOWED_IMAGE_MIME.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported image type: ${file.mimetype}`);
    }
    if (file.size > MAX_IMAGE_BYTES || file.buffer.length > MAX_IMAGE_BYTES) {
      throw new BadRequestException('Image is too large');
    }

    let objects: { path: string; body: Buffer; type: string }[];
    try {
      const [full, thumb] = await Promise.all([
        encode(file.buffer, 1600, 76),
        encode(file.buffer, 400, 70),
      ]);
      const path = `${base}.webp`;
      objects = [
        { path, body: full, type: 'image/webp' },
        { path: thumbPathOf(path), body: thumb, type: 'image/webp' },
      ];
    } catch (err: any) {
      this.logger.warn(
        `Could not optimise ${file.mimetype} (${err?.message ?? err}); storing original`,
      );
      const ext = file.mimetype.split('/')[1].replace('jpeg', 'jpg');
      const path = `${base}.${ext}`;
      objects = [{ path, body: file.buffer, type: file.mimetype }];
      // A .webp path promises a .thumb.webp next to it (thumbPathOf).
      if (ext === 'webp') {
        objects.push({ path: thumbPathOf(path), body: file.buffer, type: file.mimetype });
      }
    }

    try {
      await Promise.all(
        objects.map((o) =>
          this.client!.send(
            new PutObjectCommand({
              Bucket: this.bucket,
              Key: `${namespace}/${o.path}`,
              Body: o.body,
              ContentType: o.type,
              CacheControl: CACHE_CONTROL,
            }),
          ),
        ),
      );
    } catch (err: any) {
      this.logger.error(`R2 upload failed: ${err?.message ?? err}`);
      throw new ServiceUnavailableException('Could not store the image');
    }
    return objects[0].path;
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
      const [full, thumb] = await Promise.all([
        Promise.all(paths.map(url)),
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
