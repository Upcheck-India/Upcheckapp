import {
  groupIndian,
  formatINR,
  formatINRCompact,
  formatLakh,
} from '../inrFormat'

describe('groupIndian', () => {
  it('uses lakh/crore digit grouping', () => {
    expect(groupIndian(1234)).toBe('1,234')
    expect(groupIndian(123456)).toBe('1,23,456')
    expect(groupIndian(12345678)).toBe('1,23,45,678')
  })
  it('rounds to whole rupees', () => {
    expect(groupIndian(99.6)).toBe('100')
  })
})

describe('formatINR', () => {
  it('prefixes the rupee sign and groups', () => {
    expect(formatINR(123456)).toBe('₹1,23,456')
    expect(formatINR(0)).toBe('₹0')
  })
  it('handles negatives', () => {
    expect(formatINR(-500)).toBe('-₹500')
  })
})

describe('formatINRCompact', () => {
  it('uses crore for ≥1Cr', () => {
    expect(formatINRCompact(12_300_000)).toBe('₹1.23 Cr')
    expect(formatINRCompact(20_000_000)).toBe('₹2 Cr')
  })
  it('uses lakh for ≥1L and <1Cr', () => {
    expect(formatINRCompact(250_000)).toBe('₹2.5 L')
    expect(formatINRCompact(100_000)).toBe('₹1 L')
  })
  it('uses full grouped rupees below 1 lakh', () => {
    expect(formatINRCompact(12_345)).toBe('₹12,345')
  })
  it('handles negatives', () => {
    expect(formatINRCompact(-5_000_000)).toBe('-₹50 L')
  })
})

describe('formatLakh', () => {
  it('always renders in lakh units, trimming trailing zeros', () => {
    expect(formatLakh(250_000)).toBe('₹2.5 L')
    expect(formatLakh(100_000)).toBe('₹1 L')
  })
})
