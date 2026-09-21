/**
 * F3 retention clock — the one rule, shared by the daily pass (what may be
 * dropped now) and the notice (what the farmer is told, and when). Keeping it
 * in one function is what makes "the notice fires 30 days earlier" true.
 */
const DAY = 86_400_000;

/** Full size is kept this long after upload; the thumbnail forever. */
export const FULL_RETENTION_DAYS = 365;
/** Minimum warning between the account's notice appearing and any downgrade. */
export const NOTICE_LEAD_DAYS = 30;

/**
 * The earliest moment an object's full size may be dropped: 12 months after
 * upload, and never sooner than 30 days after its owner's notice appeared.
 * No notice yet → never (null): an account that has not been told is not
 * downgraded. That is the "not retroactive on day one" guarantee.
 */
export function retentionDropAt(uploadedAt: Date | string, noticeAt: Date | string | null | undefined): Date | null {
  if (!noticeAt) return null;
  return new Date(
    Math.max(
      new Date(uploadedAt).getTime() + FULL_RETENTION_DAYS * DAY,
      new Date(noticeAt).getTime() + NOTICE_LEAD_DAYS * DAY,
    ),
  );
}
