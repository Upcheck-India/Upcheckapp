import apiClient from './client';
import type { PublicUser } from './farmMembers';

export interface AttendanceRecord {
    id: string;
    farmId: string;
    userId: string;
    checkInAt: string;
    checkOutAt: string | null;
    /** Loaded by the server so every screen can show a name, not a uuid. */
    user?: PublicUser | null;
    createdAt: string;
    /**
     * Audit of who closed the shift (spec 2026-09-14 attendance B.1/B.6).
     * Optional: an older backend does not send them.
     */
    checkedOutById?: string | null;
    checkedOutBy?: PublicUser | null;
    checkOutReason?: CheckOutReason | null;
}

/** `self` = the member themselves; `auto_closed` = closed by a check-in elsewhere. */
export type CheckOutReason = 'self' | 'forgot' | 'left_early' | 'shift_end' | 'auto_closed' | 'other';

/** Reasons a manager may choose when checking someone else out. */
export type ManagerCheckOutReason = 'forgot' | 'left_early' | 'shift_end' | 'other';

export interface CheckOutBody {
    /** ISO instant; checkInAt ≤ checkOutAt ≤ now + 5 min, else 400. Omitted = now. */
    checkOutAt?: string;
    /** Required when checking out someone else (MANAGE_WORKERS). */
    reason?: ManagerCheckOutReason;
}

export const attendanceApi = {
    /** Own attendance for a farm (optionally scoped to one YYYY-MM-DD day). */
    mine: (farmId: string, date?: string, from?: string, to?: string) =>
        apiClient.get<AttendanceRecord[]>('/attendance/mine', { params: { farmId, date, from, to } }),

    /**
     * Every member's attendance for a farm (owner/manager only).
     *
     * `date` is one day; `from`/`to` an inclusive day range. The month
     * calendar in AttendanceLogScreen needs the whole month in one call.
     */
    getAll: (farmId: string, date?: string, from?: string, to?: string) =>
        apiClient.get<AttendanceRecord[]>('/attendance', {
            params: { farmId, date, from, to },
        }),

    /**
     * Own check-out: body optional (a past `checkOutAt` fixes a forgotten shift).
     * Someone else's: needs MANAGE_WORKERS and a `reason`. 409 = already checked
     * out (own); a manager may correct with a reason.
     */
    checkOut: (id: string, body: CheckOutBody = {}) =>
        apiClient.post<AttendanceRecord>(`/attendance/${id}/check-out`, body),
};
