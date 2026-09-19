import sharp from 'sharp';
import { R2StorageService, thumbPathOf } from './r2-storage.service';

const config = (env: Record<string, string | undefined>) =>
  ({ get: (k: string) => env[k] }) as any;

const R2_ENV = {
  R2_ACCOUNT_ID: 'acct123',
  R2_ACCESS_KEY_ID: 'AKIDEXAMPLE',
  R2_SECRET_ACCESS_KEY: 'secret',
};

/** Service with a real S3Client config (for presigning) and a mocked send(). */
function make() {
  const svc = new R2StorageService(config(R2_ENV));
  const send = jest.fn(async (_cmd: any): Promise<any> => ({}));
  (svc as any).client.send = send;
  const puts = () =>
    send.mock.calls
      .map(([c]) => c)
      .filter((c) => c.constructor.name === 'PutObjectCommand')
      .map((c) => c.input);
  return { svc, send, puts };
}

const jpeg = (width: number, height: number, exif?: any) => {
  let img = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } },
  }).jpeg();
  if (exif) img = img.withMetadata({ orientation: 6 }).withExifMerge(exif);
  return img.toBuffer();
};

const file = (buffer: Buffer, mimetype = 'image/jpeg') => ({
  buffer,
  mimetype,
  size: buffer.length,
});

describe('R2StorageService.putImage', () => {
  it('stores a 1600px WebP and a 400px WebP thumbnail with immutable caching', async () => {
    const { svc, puts } = make();
    const path = await svc.putImage('health', 'farm/uuid', file(await jpeg(3000, 1000)));

    expect(path).toBe('farm/uuid.webp');
    const [full, thumb] = puts();
    expect(full).toMatchObject({
      Bucket: 'upcheck-photos',
      Key: 'health/farm/uuid.webp',
      ContentType: 'image/webp',
      CacheControl: expect.stringContaining('immutable'),
    });
    expect(thumb.Key).toBe('health/farm/uuid.thumb.webp');
    const fm = await sharp(full.Body).metadata();
    const tm = await sharp(thumb.Body).metadata();
    expect([fm.format, fm.width, fm.height]).toEqual(['webp', 1600, 533]);
    expect([tm.format, tm.width]).toEqual(['webp', 400]);
  });

  it('never enlarges a small image', async () => {
    const { svc, puts } = make();
    await svc.putImage('feedback', 'u/x', file(await jpeg(300, 200)));
    const fm = await sharp(puts()[0].Body).metadata();
    expect([fm.width, fm.height]).toEqual([300, 200]);
  });

  it('strips EXIF (incl. GPS) from what it stores, and applies orientation first', async () => {
    const input = await jpeg(200, 100, {
      IFD0: { Copyright: 'farm-secret' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '16/1 30/1 0/1' },
    });
    // The fixture really does carry EXIF + GPS.
    const im = await sharp(input).metadata();
    expect(im.exif?.includes(Buffer.from('farm-secret'))).toBe(true);
    expect(im.orientation).toBe(6);

    const { svc, puts } = make();
    await svc.putImage('health', 'farm/uuid', file(input));
    for (const put of puts()) {
      const m = await sharp(put.Body).metadata();
      expect(m.exif).toBeUndefined();
      expect(m.orientation).toBeUndefined();
      expect(put.Body.includes(Buffer.from('farm-secret'))).toBe(false);
    }
    // Rotated 90° by the EXIF orientation before the tag was dropped.
    const fm = await sharp(puts()[0].Body).metadata();
    expect([fm.width, fm.height]).toEqual([100, 200]);
  });

  it('stores an undecodable image (e.g. HEIC) unchanged instead of failing', async () => {
    const { svc, puts } = make();
    const bytes = Buffer.from('not-an-image-sharp-can-read');
    const path = await svc.putImage('health', 'farm/uuid', file(bytes, 'image/heic'));

    expect(path).toBe('farm/uuid.heic');
    expect(puts()).toHaveLength(1);
    expect(puts()[0]).toMatchObject({
      Key: 'health/farm/uuid.heic',
      ContentType: 'image/heic',
      Body: bytes,
    });
    // Its thumbnail is itself.
    expect(thumbPathOf(path)).toBe(path);
  });

  it('rejects unsupported types and oversize files before touching R2', async () => {
    const { svc, send } = make();
    await expect(
      svc.putImage('health', 'f/u', file(Buffer.from('x'), 'application/pdf')),
    ).rejects.toThrow('Unsupported image type');
    await expect(
      svc.putImage('health', 'f/u', { buffer: Buffer.alloc(10), mimetype: 'image/jpeg', size: 6 * 1024 * 1024 }),
    ).rejects.toThrow('too large');
    expect(send).not.toHaveBeenCalled();
  });

  it('503s when R2 is not configured', async () => {
    const svc = new R2StorageService(config({}));
    await expect(svc.putImage('health', 'f/u', file(await jpeg(10, 10)))).rejects.toMatchObject({
      status: 503,
    });
  });

  it('503s (not 500) when R2 rejects the write', async () => {
    const { svc, send } = make();
    send.mockRejectedValue(new Error('boom'));
    await expect(svc.putImage('health', 'f/u', file(await jpeg(10, 10)))).rejects.toMatchObject({
      status: 503,
    });
  });
});

describe('R2StorageService.sign', () => {
  it('presigns full and thumb GETs locally, 1h, in order, no network call', async () => {
    const { svc, send } = make();
    const { full, thumb } = await svc.sign('health', ['f/a.webp', 'f/b.heic']);

    expect(send).not.toHaveBeenCalled();
    expect(full[0]).toMatch(
      /^https:\/\/upcheck-photos\.acct123\.r2\.cloudflarestorage\.com\/health\/f\/a\.webp\?.*X-Amz-Expires=3600/,
    );
    expect(full[1]).toContain('/health/f/b.heic?');
    expect(thumb[0]).toContain('/health/f/a.thumb.webp?');
    expect(thumb[1]).toContain('/health/f/b.heic?');
  });

  it('returns empty lists when R2 is not configured', async () => {
    const svc = new R2StorageService(config({}));
    await expect(svc.sign('feedback', ['u/a.webp'])).resolves.toEqual({ full: [], thumb: [] });
  });
});

describe('R2StorageService deletes', () => {
  it('deleteImages removes each image and its thumbnail', async () => {
    const { svc, send } = make();
    await svc.deleteImages('avatars', ['u/a.webp']);
    const [cmd] = send.mock.calls[0];
    expect(cmd.input.Delete.Objects).toEqual([
      { Key: 'avatars/u/a.webp' },
      { Key: 'avatars/u/a.thumb.webp' },
    ]);
  });

  it('deleteImages throws when R2 reports a per-key error', async () => {
    const { svc, send } = make();
    send.mockResolvedValue({ Errors: [{ Key: 'avatars/u/a.webp' }] });
    await expect(svc.deleteImages('avatars', ['u/a.webp'])).rejects.toThrow('R2 delete failed');
  });

  it('deletePrefix lists every page under the prefix and deletes it', async () => {
    const { svc, send } = make();
    send.mockImplementation(async (cmd: any) => {
      if (cmd.constructor.name !== 'ListObjectsV2Command') return {};
      return cmd.input.ContinuationToken
        ? { Contents: [{ Key: 'avatars/u1/c.webp' }], IsTruncated: false }
        : { Contents: [{ Key: 'avatars/u1/a.webp' }, { Key: 'avatars/u1/a.thumb.webp' }], IsTruncated: true, NextContinuationToken: 't2' };
    });
    await svc.deletePrefix('avatars', 'u1/');

    const calls = send.mock.calls.map(([c]) => c);
    expect(calls[0].input.Prefix).toBe('avatars/u1/');
    const deleted = calls
      .filter((c) => c.constructor.name === 'DeleteObjectsCommand')
      .flatMap((c) => c.input.Delete.Objects.map((o: any) => o.Key));
    expect(deleted).toEqual(['avatars/u1/a.webp', 'avatars/u1/a.thumb.webp', 'avatars/u1/c.webp']);
  });
});
