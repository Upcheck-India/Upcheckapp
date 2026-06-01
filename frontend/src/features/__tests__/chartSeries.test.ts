import {
  buildMultiSeries,
  normalizeTo100,
  hexToRgba,
  ParameterSeries,
} from '../chartSeries'

describe('hexToRgba', () => {
  it('parses a 6-digit hex with or without leading #', () => {
    expect(hexToRgba('#0D84D6')(1)).toBe('rgba(13,132,214,1)')
    expect(hexToRgba('0D84D6')(0.5)).toBe('rgba(13,132,214,0.5)')
  })

  it('falls back to grey for invalid input', () => {
    expect(hexToRgba('not-a-color')(1)).toBe('rgba(120,144,159,1)')
  })
})

describe('normalizeTo100', () => {
  it('maps min to 0 and max to 100', () => {
    const out = normalizeTo100([2, 4, 6])
    expect(out[0]).toBeCloseTo(0)
    expect(out[1]).toBeCloseTo(50)
    expect(out[2]).toBeCloseTo(100)
  })

  it('maps a flat series to the midline', () => {
    expect(normalizeTo100([5, 5, 5])).toEqual([50, 50, 50])
  })

  it('returns empty for empty input', () => {
    expect(normalizeTo100([])).toEqual([])
  })
})

describe('buildMultiSeries', () => {
  const ph: ParameterSeries = {
    key: 'ph',
    label: 'pH',
    color: '#0D84D6',
    points: [
      { label: 'Mon', value: 7.8 },
      { label: 'Tue', value: 8.0 },
      { label: 'Wed', value: 8.2 },
    ],
  }
  const ammonia: ParameterSeries = {
    key: 'nh3',
    label: 'Ammonia',
    color: '#E03535',
    points: [
      { label: 'Mon', value: 0.1 },
      { label: 'Tue', value: 0.3 },
      { label: 'Wed', value: 0.2 },
    ],
  }

  it('overlays unlike-scaled series on a shared 0–100 axis', () => {
    const res = buildMultiSeries([ph, ammonia])
    expect(res.labels).toEqual(['Mon', 'Tue', 'Wed'])
    expect(res.datasets).toHaveLength(2)
    // Every normalized value lands within [0,100].
    for (const ds of res.datasets) {
      for (const v of ds.data) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })

  it('carries real min/max in the legend', () => {
    const res = buildMultiSeries([ph, ammonia])
    const nh3 = res.legend.find((l) => l.key === 'nh3')!
    expect(nh3.min).toBeCloseTo(0.1)
    expect(nh3.max).toBeCloseTo(0.3)
    expect(nh3.normalized).toBe(true)
  })

  it('preserves raw values when normalize=false', () => {
    const res = buildMultiSeries([ph], { normalize: false })
    expect(res.datasets[0].data).toEqual([7.8, 8.0, 8.2])
    expect(res.legend[0].normalized).toBe(false)
  })

  it('truncates all series to the shortest length', () => {
    const short: ParameterSeries = {
      ...ammonia,
      points: [{ label: 'Mon', value: 0.1 }],
    }
    const res = buildMultiSeries([ph, short])
    expect(res.labels).toEqual(['Mon'])
    expect(res.datasets[0].data).toHaveLength(1)
    expect(res.datasets[1].data).toHaveLength(1)
  })

  it('drops empty series and returns empty for all-empty input', () => {
    const empty: ParameterSeries = { ...ph, points: [] }
    expect(buildMultiSeries([empty])).toEqual({
      labels: [],
      datasets: [],
      legend: [],
    })
    const res = buildMultiSeries([ph, empty])
    expect(res.datasets).toHaveLength(1)
  })
})
