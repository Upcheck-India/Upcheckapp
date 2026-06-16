import * as Crypto from 'expo-crypto';
import apiClient from '../api/client';
import { useSyncStore, type QueuedOperation } from '../store/syncStore';

/**
 * Shared offline-aware save path for operational records (feed, water quality,
 * sampling, mortality). Every record is stamped with a client-minted UUID so a
 * retry/replay is idempotent on the backend (accept-id + insert-or-ignore) —
 * a double-drain can never create a duplicate.
 *
 * Online  → POST immediately; on a *network* error, queue for later.
 * Offline → queue immediately and return optimistically ("saved, will sync").
 * A server rejection (4xx/5xx with a response) is a real error and is thrown.
 */
export interface SaveRecordArgs {
    entity: string; // e.g. 'water_quality', 'feed', 'sampling', 'mortality'
    endpoint: string; // e.g. '/water-quality'
    payload: Record<string, unknown>; // record fields (id is added if absent)
}

export interface SaveRecordResult {
    id: string;
    queued: boolean; // true => stored locally, will sync on reconnect
    data?: any; // server response when sent immediately
}

/** axios surfaces network/timeout failures with no `response`. */
function isNetworkError(err: any): boolean {
    return !err?.response;
}

export async function saveRecord({ entity, endpoint, payload }: SaveRecordArgs): Promise<SaveRecordResult> {
    const id = (payload.id as string) || Crypto.randomUUID();
    const body = { ...payload, id };
    const sync = useSyncStore.getState();

    const queue = () =>
        sync.enqueue({ type: 'CREATE', entity, endpoint, method: 'POST', payload: body, localId: id });

    if (!sync.isConnected) {
        queue();
        return { id, queued: true };
    }

    try {
        const { data } = await apiClient.post(endpoint, body);
        return { id, queued: false, data };
    } catch (err) {
        if (isNetworkError(err)) {
            queue();
            return { id, queued: true };
        }
        throw err; // validation / permission / conflict the user must see
    }
}

/**
 * Replay one queued op. 2xx => done. A 4xx is a permanent rejection (or a
 * duplicate the backend already has) → drop it. Network errors / 5xx are
 * transient → keep for the next reconnect.
 */
export async function replayQueuedOp(op: QueuedOperation): Promise<boolean> {
    try {
        await apiClient.request({ method: op.method, url: op.endpoint, data: op.payload });
        return true;
    } catch (err: any) {
        const status = err?.response?.status;
        if (status && status >= 400 && status < 500) return true; // permanent → drop
        return false; // transient → retry later
    }
}

/**
 * Flush pending writes — call on reconnect and on app start. Moves any
 * transient-failed ops back into the queue, then drains. No-op when offline or
 * the queue is empty.
 */
export async function drainRecordQueue(): Promise<void> {
    const sync = useSyncStore.getState();
    if (!sync.isConnected) return;
    sync.retryFailed();
    await sync.drainQueue(replayQueuedOp);
}
