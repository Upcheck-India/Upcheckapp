import { ForbiddenException } from '@nestjs/common';
import { HealthPhotoStorageService } from './health-photo-storage.service';

/**
 * F5 test gate: "every new column rejects a foreign-farm path". Every F5
 * entity service calls `applyRecordPhotos`/`applySinglePhoto`, so proving
 * the rejection here proves it for all eleven — they share this one gate.
 */
describe('HealthPhotoStorageService.applyRecordPhotos (F5)', () => {
  const FARM = '11111111-1111-1111-1111-111111111111';
  const OTHER_FARM = '22222222-2222-2222-2222-222222222222';
  const PHOTO_UUID = '33333333-3333-3333-3333-333333333333';

  const ownPath = `${FARM}/${PHOTO_UUID}.jpg`;
  const foreignPath = `${OTHER_FARM}/${PHOTO_UUID}.jpg`;

  const build = () => {
    const ledger = { attach: jest.fn().mockResolvedValue(undefined), ownerOfFarm: jest.fn() };
    const deletions = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const storage = {} as any;
    const svc = new HealthPhotoStorageService(storage, deletions as any, ledger as any);
    const manager = { query: jest.fn().mockResolvedValue([]) } as any;
    return { svc, manager, ledger, deletions };
  };

  it('403s a path from another farm, and writes nothing', async () => {
    const { svc, manager } = build();
    await expect(
      svc.applyRecordPhotos(manager, 'treatments', 'treatment', FARM, 'rec-1', [foreignPath]),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // Guarded write never ran — the query mock was only used by the (never
    // reached) writePhotoPaths call, so it stays uncalled.
    expect(manager.query).not.toHaveBeenCalled();
  });

  it('accepts this farm\'s own path, writes photo_paths and attaches the ledger row', async () => {
    const { svc, manager, ledger } = build();
    await svc.applyRecordPhotos(manager, 'treatments', 'treatment', FARM, 'rec-1', [ownPath], 'crop-1');
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE treatments SET photo_paths'),
      ['rec-1', [ownPath]],
    );
    expect(ledger.attach).toHaveBeenCalledWith('health', [ownPath], {
      entity: 'treatment',
      recordId: 'rec-1',
      cropId: 'crop-1',
    });
  });

  it('degrades to a no-op write (not a throw) when the column is not migrated', async () => {
    const { svc, manager } = build();
    manager.query.mockRejectedValueOnce(Object.assign(new Error('missing'), { code: '42703' }));
    await expect(
      svc.applyRecordPhotos(manager, 'treatments', 'treatment', FARM, 'rec-1', [ownPath]),
    ).resolves.toBeUndefined();
  });
});

/** F5 pond/farm identity photo: replace enqueues the OLD one for deletion. */
describe('HealthPhotoStorageService.applySinglePhoto (F5 replace pattern)', () => {
  const FARM = '11111111-1111-1111-1111-111111111111';
  const OLD_UUID = '44444444-4444-4444-4444-444444444444';
  const NEW_UUID = '55555555-5555-5555-5555-555555555555';
  const oldPath = `${FARM}/${OLD_UUID}.jpg`;
  const newPath = `${FARM}/${NEW_UUID}.jpg`;

  const build = (current: string | null) => {
    const ledger = { attach: jest.fn().mockResolvedValue(undefined) };
    const deletions = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const svc = new HealthPhotoStorageService({} as any, deletions as any, ledger as any);
    const manager = {
      query: jest.fn().mockImplementation((sql: string) =>
        sql.startsWith('SELECT') ? Promise.resolve([{ photo_paths: current ? [current] : null }]) : Promise.resolve([]),
      ),
    } as any;
    return { svc, manager, ledger, deletions };
  };

  it('replacing an existing pond photo enqueues the OLD path for deletion', async () => {
    const { svc, manager, deletions } = build(oldPath);
    await svc.applySinglePhoto(manager, 'ponds', 'pond', FARM, 'pond-1', newPath, 'user-1');
    expect(deletions.enqueue).toHaveBeenCalledWith(
      [{ namespace: 'health', path: oldPath }],
      'photo_removed',
      'user-1',
      manager,
    );
  });

  it('setting a photo for the first time enqueues nothing', async () => {
    const { svc, deletions, manager } = build(null);
    await svc.applySinglePhoto(manager, 'ponds', 'pond', FARM, 'pond-1', newPath, 'user-1');
    expect(deletions.enqueue).not.toHaveBeenCalled();
  });

  it('a foreign-farm replacement path is rejected and nothing is queued', async () => {
    const { svc, manager, deletions } = build(oldPath);
    const foreign = `99999999-9999-9999-9999-999999999999/${NEW_UUID}.jpg`;
    await expect(
      svc.applySinglePhoto(manager, 'ponds', 'pond', FARM, 'pond-1', foreign, 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deletions.enqueue).not.toHaveBeenCalled();
  });
});
