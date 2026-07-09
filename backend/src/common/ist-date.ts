/**
 * Calendar-day bucketing for reports/plans (DATE-1).
 *
 * The app's canonical day boundary is the farm's LOCAL day — IST (UTC+5:30, no
 * DST) for launch. Deriving the day with `toISOString().split('T')[0]` buckets
 * in UTC, so anything logged before 05:30 IST lands on the previous calendar
 * day (the classic pre-dawn DO reading). Shifting by the fixed IST offset before
 * taking the date portion fixes that.
 *
 * ponytail: hard-coded +5:30. When the app goes multi-timezone, pass the farm's
 * offset/zone instead of assuming IST.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** `YYYY-MM-DD` for the given instant in IST-local time. */
export function toIstDateString(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];
}
