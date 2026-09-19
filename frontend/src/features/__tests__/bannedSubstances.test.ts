import {
  findBannedSubstances,
  containsBannedSubstance,
} from '../bannedSubstances'

describe('findBannedSubstances', () => {
  it('detects a banned substance by name, case-insensitively', () => {
    const hits = findBannedSubstances('Dosed pond with Chloramphenicol yesterday')
    expect(hits.map((h) => h.name)).toContain('Chloramphenicol')
  })

  it('does not treat lab metabolite codes as free-text matches (spec D1)', () => {
    // AOZ/AMOZ/SEM/AHD are lab-report terms kept in `labCodes`; "sem" is also
    // an everyday word fragment, so free text never matches them.
    expect(findBannedSubstances('sem sample sent to the lab')).toEqual([])
    expect(findBannedSubstances('lab flagged AOZ residue')).toEqual([])
  })

  it('matches native-script names (hi te ta bn or)', () => {
    for (const text of [
      'कोलिस्टिन डाला',
      'కొలిస్టిన్ వేశాం',
      'கொலிஸ்டின் கொடுத்தோம்',
      'কোলিস্টিন দিয়েছি',
      'କୋଲିଷ୍ଟିନ ଦିଆଗଲା',
    ]) {
      expect(findBannedSubstances(text).map((h) => h.name)).toEqual(['Colistin'])
    }
  })

  it('matches "sulphamethoxazole" (Latin ph→f)', () => {
    expect(findBannedSubstances('Sulphamethoxazole 2 g').map((h) => h.name)).toEqual([
      'Sulfamethoxazole',
    ])
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
