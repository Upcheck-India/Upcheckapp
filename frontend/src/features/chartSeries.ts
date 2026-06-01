/**
 * Multi-parameter analytical overlay — pure transforms for plotting several
 * water-quality parameters (different units/scales) on one chart for correlation
 * analysis (e.g. total vibrio + total bacteria vs TOM).
 *
 * Parameters with unlike ranges are min–max normalized to a shared 0–100 axis so
 * their *shapes* can be compared; the original min/max travel in the legend so the
 * real values stay readable. Output matches the shape react-native-chart-kit's
 * LineChart expects: { labels, datasets:[{data, color}] }.
 */

export interface SeriesPoint {
  label: string
  value: number
}

export interface ParameterSeries {
  key: string
  label: string
  /** Hex color, e.g. '#0D84D6'. */
  color: string
  points: SeriesPoint[]
}

export interface SeriesLegendItem {
  key: string
  label: string
  color: string
  min: number
  max: number
  /** True when the series was rescaled (i.e. shown on the shared 0–100 axis). */
  normalized: boolean
}

export interface MultiSeriesResult {
  labels: string[]
  datasets: { data: number[]; color: (opacity: number) => string }[]
  legend: SeriesLegendItem[]
}

/** Convert a #rrggbb hex string to a chart-kit color function. Falls back to grey. */
export function hexToRgba(hex: string): (opacity: number) => string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return (o = 1) => `rgba(120,144,159,${o})`
  const int = parseInt(m[1], 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return (o = 1) => `rgba(${r},${g},${b},${o})`
}

/** Min–max normalize a list of values to [0,100]; a flat series maps to the midline. */
export function normalizeTo100(values: number[]): number[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return values.map(() => 50)
  return values.map((v) => ((v - min) / (max - min)) * 100)
}

export interface BuildMultiSeriesOptions {
  /** Rescale each series to a shared 0–100 axis (default true). */
  normalize?: boolean
}

/**
 * Build an overlay chart payload from several parameter series.
 *
 * Series are aligned by index and truncated to the shortest non-empty series so
 * every dataset matches the label count (chart-kit maps data→labels positionally).
 * Empty series are dropped.
 */
export function buildMultiSeries(
  series: ParameterSeries[],
  options: BuildMultiSeriesOptions = {},
): MultiSeriesResult {
  const normalize = options.normalize ?? true
  const usable = series.filter((s) => s.points.length > 0)

  if (usable.length === 0) {
    return { labels: [], datasets: [], legend: [] }
  }

  const length = Math.min(...usable.map((s) => s.points.length))
  const labels = usable[0].points.slice(0, length).map((p) => p.label)

  const datasets = usable.map((s) => {
    const raw = s.points.slice(0, length).map((p) => p.value)
    return {
      data: normalize ? normalizeTo100(raw) : raw,
      color: hexToRgba(s.color),
    }
  })

  const legend: SeriesLegendItem[] = usable.map((s) => {
    const raw = s.points.slice(0, length).map((p) => p.value)
    return {
      key: s.key,
      label: s.label,
      color: s.color,
      min: Math.min(...raw),
      max: Math.max(...raw),
      normalized: normalize,
    }
  })

  return { labels, datasets, legend }
}

export default { buildMultiSeries, normalizeTo100, hexToRgba }
