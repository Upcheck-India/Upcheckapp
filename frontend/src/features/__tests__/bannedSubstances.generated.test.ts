import fs from 'fs'
import path from 'path'
import { BANNED_SUBSTANCES as bundled } from '../bannedSubstances.generated'
import { pickNewer } from '../bannedSubstancesStore'

// Behavioural parity (same inputs → same matches on both sides) is tested in
// backend/src/banned-substances/banned-substance-matcher.parity.spec.ts; the
// freshness check here guarantees the app ships exactly the backend's code.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const gen = require('../../../scripts/gen-banned.js') as {
  FILES: Array<{ src: string; out: string }>
  OUT_DIR: string
  render: (f: { src: string; out: string }) => string
  lf: (s: string) => string
}

describe('generated banned list (spec D1: one copy)', () => {
  for (const file of gen.FILES) {
    it(`${file.out} is fresh (run \`npm run gen:banned\` in frontend/ if this fails)`, () => {
      const onDisk = gen.lf(fs.readFileSync(path.join(gen.OUT_DIR, file.out), 'utf8'))
      expect(onDisk).toBe(gen.render(file))
    })
  }
})

describe('pickNewer (cached vs bundled list)', () => {
  it('keeps the bundled list over an older cached one', () => {
    expect(pickNewer({ version: '2026-07-08', substances: [bundled[0]] }).substances).toBe(bundled)
  })

  it('uses a newer cached/server list', () => {
    const newer = [bundled[0]]
    expect(pickNewer({ version: '2099-01-01', substances: newer }).substances).toBe(newer)
  })

  it('falls back to bundled for an empty or missing cache', () => {
    expect(pickNewer(undefined).substances).toBe(bundled)
    expect(pickNewer({ version: '2099-01-01', substances: [] }).substances).toBe(bundled)
  })
})
