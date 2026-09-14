import { describe, expect, it } from 'vitest'
import { formatDealValue } from './deal-value'

describe('formatDealValue', () => {
  it('groups thousands as they are typed', () => {
    expect(formatDealValue('1')).toBe('1')
    expect(formatDealValue('1200')).toBe('1,200')
    expect(formatDealValue('12000')).toBe('12,000')
    expect(formatDealValue('1234567')).toBe('1,234,567')
  })

  it('re-groups a value that already has commas in the wrong places', () => {
    expect(formatDealValue('1,2000')).toBe('12,000')
  })

  it('keeps up to two decimals', () => {
    expect(formatDealValue('12000.5')).toBe('12,000.5')
    expect(formatDealValue('12000.567')).toBe('12,000.56')
    expect(formatDealValue('12000.')).toBe('12,000.')
  })

  it('drops everything that is not a number', () => {
    expect(formatDealValue('$12,000 USD')).toBe('12,000')
    expect(formatDealValue('abc')).toBe('')
    expect(formatDealValue('1.2.3')).toBe('1.23')
  })

  it('drops leading zeros but keeps a lone zero and a leading point', () => {
    expect(formatDealValue('007')).toBe('7')
    expect(formatDealValue('0')).toBe('0')
    expect(formatDealValue('.5')).toBe('.5')
    expect(formatDealValue('')).toBe('')
  })

  it('strips back to the number the server expects', () => {
    expect(formatDealValue('1234567.89').replace(/,/g, '')).toBe('1234567.89')
  })
})
