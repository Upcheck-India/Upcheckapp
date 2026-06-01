import {
  findBannedSubstances,
  containsBannedSubstance,
} from '../bannedSubstances'

describe('findBannedSubstances', () => {
  it('detects a banned substance by name, case-insensitively', () => {
    const hits = findBannedSubstances('Dosed pond with Chloramphenicol yesterday')
    expect(hits.map((h) => h.name)).toContain('Chloramphenicol')
  })

  it('detects nitrofuran metabolites (AOZ/AMOZ/SEM/AHD)', () => {
    expect(findBannedSubstances('lab flagged AOZ residue').map((h) => h.name)).toContain(
      'Nitrofurans',
    )
    expect(findBannedSubstances('SEM detected').map((h) => h.name)).toContain('Nitrofurans')
  })

  it('flags a restricted substance distinctly', () => {
    const hits = findBannedSubstances('applied oxytetracycline')
    expect(hits).toHaveLength(1)
    expect(hits[0].category).toBe('restricted')
  })

  it('returns each substance once even with multiple aliases present', () => {
    const hits = findBannedSubstances('ciprofloxacin and enrofloxacin both used')
    expect(hits.filter((h) => h.name === 'Fluoroquinolones')).toHaveLength(1)
  })

  it('does not match substrings inside unrelated words', () => {
    // "sem" must not match inside "system"; "semaphore" etc.
    expect(findBannedSubstances('the system is fine')).toHaveLength(0)
  })

  it('returns empty for clean or empty text', () => {
    expect(findBannedSubstances('probiotics and lime only')).toEqual([])
    expect(findBannedSubstances('')).toEqual([])
    expect(findBannedSubstances(null)).toEqual([])
    expect(findBannedSubstances(undefined)).toEqual([])
  })

  it('detects multiple distinct substances', () => {
    const hits = findBannedSubstances('used colistin and neomycin')
    expect(hits.map((h) => h.name).sort()).toEqual(['Colistin', 'Neomycin'])
  })
})

describe('containsBannedSubstance', () => {
  it('is true when a banned substance is present', () => {
    expect(containsBannedSubstance('metronidazole treatment')).toBe(true)
  })
  it('is false for clean text', () => {
    expect(containsBannedSubstance('water exchange done')).toBe(false)
  })
})
