import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { measurementsApi, type CreateMeasurementInput } from './measurements';

/**
 * Offline-first measurement queue (PRD §8.A / farmer_features_spec §10).
 *
 * Capture works with no signal: each reading is stamped with a client-minted
 * UUID and persisted locally, then flushed through the idempotent batch
 * endpoint (`POST /measurements/batch`). Because ingest is idempotent on the
 * `id`, a partial/failed flush can be retried safely with no duplicates.
 */
const QUEUE_KEY = 'measurement_sync_queue_v1';

async function readQueue(): Promise<CreateMeasurementInput[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as CreateMeasurementInput[]) : [];
}

async function writeQueue(items: CreateMeasurementInput[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export const measurementSync = {
  /** Queue a reading for sync, minting a stable id if one isn't supplied. */
  async enqueue(m: CreateMeasurementInput): Promise<string> {
    const id = m.id ?? Crypto.randomUUID();
    const queue = await readQueue();
    queue.push({ ...m, id });
    await writeQueue(queue);
    return id;
  },

  /** Number of readings awaiting sync (for the pending-sync badge). */
  async pendingCount(): Promise<number> {
    return (await readQueue()).length;
  },

  /**
   * Flush the queue via the batch endpoint. Items the server accepted
   * (created or duplicate) are removed; genuine errors stay queued for the
   * next attempt. Returns counts. No-op (synced:0) when the queue is empty.
   */
  async flush(): Promise<{ synced: number; remaining: number }> {
    const queue = await readQueue();
    if (queue.length === 0) return { synced: 0, remaining: 0 };

    const { data } = await measurementsApi.createBatch(queue, true);
    const okIndexes = new Set(
      data.results
        .filter((r) => r.status === 'created' || r.status === 'duplicate')
        .map((r) => r.index),
    );
    const remaining = queue.filter((_, i) => !okIndexes.has(i));
    await writeQueue(remaining);
    return { synced: okIndexes.size, remaining: remaining.length };
  },

  /** Clear the queue (e.g. on logout). */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};
