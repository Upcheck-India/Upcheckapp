/** Local (device-timezone) calendar date as YYYY-MM-DD.
 *
 * `new Date().toISOString()` is UTC, which is the wrong calendar day for
 * IST users between 00:00–05:30 local time. Use local getters instead.
 */
export function toLocalISODate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function todayLocalISODate(): string {
    return toLocalISODate(new Date());
}
