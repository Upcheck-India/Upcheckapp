import { buildAlerts, criticalCount } from '../alerts'

// Local-time date → ISO round-trips back to the same local hour, so the
// nighttime-hour logic is timezone-independent in tests.
function localIso(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

describe('buildAlerts', () => {
  const now = new Date(2024, 5, 1, 14, 0, 0) // 2pm local

  it('flags critical out-of-range parameters and ignores optimal ones', () => {
    const alerts = buildAlerts({
      species: 'vannamei',
      now,
      reading: { ph: 8.0, dissolvedOxygen: 2, ammonia: 0.6, recordedAt: localIso(2024, 6, 1, 14) },
    })
    const ids = alerts.map((a) => a.id)
    expect(ids).toContain('wq:do') // 2 mg/L → critical-low
    expect(ids).toContain('wq:ammonia') // 0.6 → critical-high
    expect(ids).not.toContain('wq:ph') // 8.0 optimal
    expect(alerts.find((a) => a.id === 'wq:do')?.severity).toBe('critical')
  })

  it('raises a nighttime oxygen-crash alert for a low night reading', () => {
    const alerts = buildAlerts({
      species: 'vannamei',
      now,
      reading: { dissolvedOxygen: 3.5, recordedAt: localIso(2024, 6, 1, 3) }, // 3am
    })
    expect(alerts.map((a) => a.id)).toContain('do:nighttime')
  })

  it('does not raise the nighttime alarm for a daytime reading', () => {
    const alerts = buildAlerts({
      species: 'vannamei',
      now,
      reading: { dissolvedOxygen: 3.5, recordedAt: localIso(2024, 6, 1, 14) },
    })
    expect(alerts.map((a) => a.id)).not.toContain('do:nighttime')
  })

  it('warns on stale readings and informs when none exist', () => {
    const stale = buildAlerts({
      species: 'vannamei',
      now,
      reading: { ph: 8, recordedAt: new Date(now.getTime() - 30 * 3_600_000).toISOString() },
    })
    expect(stale.map((a) => a.id)).toContain('data:stale')

    const none = buildAlerts({ species: 'vannamei', now, reading: null })
    expect(none.map((a) => a.id)).toContain('data:none')
  })

  it('flags banned substances from notes as compliance-critical', () => {
    const alerts = buildAlerts({
      species: 'vannamei',
      now,
      reading: { ph: 8, recordedAt: localIso(2024, 6, 1, 14) },
      notes: 'treated with chloramphenicol',
    })
    const banned = alerts.find((a) => a.category === 'compliance')
    expect(banned).toBeTruthy()
    expect(banned?.severity).toBe('critical')
  })

  it('sorts critical before warning before info', () => {
    const alerts = buildAlerts({
      species: 'vannamei',
      now,
      reading: { dissolvedOxygen: 2, recordedAt: new Date(now.getTime() - 30 * 3_600_000).toISOString() },
    })
    const ranks = alerts.map((a) => a.severity)
    const idx = (s: string) => ranks.indexOf(s as any)
    if (idx('critical') !== -1 && idx('warning') !== -1) {
      expect(idx('critical')).toBeLessThan(idx('warning'))
    }
    expect(criticalCount(alerts)).toBeGreaterThanOrEqual(1)
  })

  it('applies species-specific salinity bands', () => {
    // 20 ppt: critical for freshwater scampi, optimal for vannamei.
    const scampi = buildAlerts({
      species: 'scampi',
      now,
      reading: { salinity: 20, recordedAt: localIso(2024, 6, 1, 14) },
    })
    expect(scampi.map((a) => a.id)).toContain('wq:salinity')
    const van = buildAlerts({
      species: 'vannamei',
      now,
      reading: { salinity: 20, recordedAt: localIso(2024, 6, 1, 14) },
    })
    expect(van.map((a) => a.id)).not.toContain('wq:salinity')
  })
})
