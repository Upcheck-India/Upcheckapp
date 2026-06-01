/**
 * INR money formatting for the Indian market (spec: INR_Formatter).
 *
 * Uses the Indian digit-grouping system (lakh/crore) via Intl.NumberFormat
 * ('en-IN') and offers a compact lakh/crore notation for dashboards where full
 * rupee figures are too wide. Pure and unit-tested.
 *
 * Amounts are whole rupees; fractional paise are rounded. Negative values are
 * formatted with a leading minus inside the currency.
 */

const LAKH = 100_000
const CRORE = 10_000_000

let inrFormatter: Intl.NumberFormat | null = null
function grouping(): Intl.NumberFormat {
  // Lazy + cached; falls back gracefully if Intl/en-IN is unavailable.
  if (inrFormatter) return inrFormatter
  try {
    inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
  } catch {
    inrFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })
  }
  return inrFormatter
}

/** Group an integer with Indian digit grouping, e.g. 123456 → "1,23,456". */
export function groupIndian(amount: number): string {
  const rounded = Math.round(amount)
  return grouping().format(rounded)
}

/** Full rupee amount, e.g. 123456 → "₹1,23,456"; -500 → "-₹500". */
export function formatINR(amount: number): string {
  const neg = amount < 0
  const body = groupIndian(Math.abs(amount))
  return `${neg ? '-' : ''}₹${body}`
}

/**
 * Compact INR using lakh/crore for large values:
 *  - ≥ 1 crore → "₹1.23 Cr"
 *  - ≥ 1 lakh  → "₹1.23 L"
 *  - otherwise → full grouped rupees ("₹12,345")
 * `decimals` controls the L/Cr precision (default 2, trailing zeros trimmed).
 */
export function formatINRCompact(amount: number, decimals = 2): string {
  const neg = amount < 0
  const abs = Math.abs(amount)
  const sign = neg ? '-' : ''

  const trim = (n: number) =>
    n.toFixed(decimals).replace(/\.?0+$/, '')

  if (abs >= CRORE) return `${sign}₹${trim(abs / CRORE)} Cr`
  if (abs >= LAKH) return `${sign}₹${trim(abs / LAKH)} L`
  return `${sign}₹${groupIndian(abs)}`
}

/** Amount expressed in lakh, e.g. 250000 → "₹2.5 L". Always lakh units. */
export function formatLakh(amount: number, decimals = 2): string {
  const sign = amount < 0 ? '-' : ''
  const v = Math.abs(amount) / LAKH
  return `${sign}₹${v.toFixed(decimals).replace(/\.?0+$/, '')} L`
}

export default { groupIndian, formatINR, formatINRCompact, formatLakh }
