import {
  moonPhase,
  upcomingPhases,
  SYNODIC_MONTH,
} from '../moonPhase'

/** Build a UTC date so tests are timezone-independent. */
function utc(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min))
}

describe('moonPhase', () => {
  it('reports a new moon at the reference epoch (2000-01-06 18:14 UTC)', () => {
    const p = moonPhase(utc(2000, 1, 6, 18, 14))
    expect(p.ageDays).toBeCloseTo(0, 2)
    expect(p.fraction).toBeCloseTo(0, 3)
    expect(p.illumination).toBeLessThan(0.01)
    expect(p.name).toBe('New Moon')
    expect(p.isMoltingWindow).toBe(true)
  })

  it('keeps fraction in [0,1) and illumination in [0,1] across a full cycle', () => {
    for (let day = 0; day < 30; day += 1) {
      const p = moonPhase(utc(2024, 1, 1 + day))
      expect(p.fraction).toBeGreaterThanOrEqual(0)
      expect(p.fraction).toBeLessThan(1)
      expect(p.illumination).toBeGreaterThanOrEqual(0)
      expect(p.illumination).toBeLessThanOrEqual(1)
    }
  })

  it('is nearly dark at a known new moon (2024-01-11)', () => {
    const p = moonPhase(utc(2024, 1, 11, 11, 57))
    expect(p.illumination).toBeLessThan(0.1)
    expect(p.name).toBe('New Moon')
    expect(p.isMoltingWindow).toBe(true)
  })

  it('is nearly full at a known full moon (2024-01-25)', () => {
    const p = moonPhase(utc(2024, 1, 25, 17, 54))
    expect(p.illumination).toBeGreaterThan(0.9)
    expect(p.name).toBe('Full Moon')
    expect(p.isMoltingWindow).toBe(true)
  })

  it('flags the first quarter as a non-molting, half-lit waxing phase', () => {
    // ~7.4 days after the reference new moon.
    const p = moonPhase(
      new Date(utc(2000, 1, 6, 18, 14).getTime() + (SYNODIC_MONTH / 4) * 86_400_000),
    )
    expect(p.name).toBe('First Quarter')
    expect(p.illumination).toBeCloseTo(0.5, 1)
    expect(p.isMoltingWindow).toBe(false)
  })

  it('handles dates before the epoch via positive modulo', () => {
    const p = moonPhase(utc(1999, 12, 23, 0, 0))
    expect(p.fraction).toBeGreaterThanOrEqual(0)
    expect(p.fraction).toBeLessThan(1)
    expect(p.illumination).toBeGreaterThanOrEqual(0)
  })
})

describe('upcomingPhases', () => {
  it('returns the requested number of strictly future phases, sorted', () => {
    const now = utc(2024, 6, 1)
    const phases = upcomingPhases(now, 4)
    expect(phases).toHaveLength(4)
    for (const ph of phases) {
      expect(ph.date.getTime()).toBeGreaterThan(now.getTime())
      expect(ph.inDays).toBeGreaterThanOrEqual(0)
    }
    const times = phases.map((p) => p.date.getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it('cycles through the four principal phases', () => {
    const phases = upcomingPhases(utc(2024, 6, 1), 4)
    const names = new Set(phases.map((p) => p.name))
    // Over four consecutive principal events we should see at least 3 distinct.
    expect(names.size).toBeGreaterThanOrEqual(3)
  })
})
