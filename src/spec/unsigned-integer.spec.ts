import { expect, describe, it } from 'vitest'
import { evaluate } from '..'

describe('unsigned integers', () => {
  it('should evaluate a simple unsigned integer', () => {
    expect(evaluate('123u')).toBe(123)
  })

  it('should evaluate a uppercase U unsigned integer', () => {
    expect(evaluate('456U')).toBe(456)
  })

  it('should evaluate zero as unsigned integer', () => {
    expect(evaluate('0u')).toBe(0)
  })

  it('should preserve the unsigned integer type in calculations', () => {
    expect(evaluate('10u + 5')).toBe(15)
  })

  it('should handle unsigned integers in comparisons', () => {
    expect(evaluate('100u > 50')).toBe(true)
  })

  it('should evaluate a hexadecimal unsigned integer with uppercase', () => {
    expect(evaluate('0xABCDU')).toBe(43981)
  })
})
