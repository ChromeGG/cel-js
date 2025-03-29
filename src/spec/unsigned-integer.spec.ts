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

  it('should handle unsigned integers in expressions', () => {
    expect(evaluate('(10u * 2) + 5')).toBe(25)
  })

  it('should handle unsigned integers in comparisons', () => {
    expect(evaluate('100u > 50')).toBe(true)
  })

  it('should handle unsigned integers in lists', () => {
    expect(evaluate('[1u, 2u, 3u][1]')).toBe(2)
  })

  it('should evaluate a hexadecimal unsigned integer', () => {
    expect(evaluate('0xFFu')).toBe(255)
  })

  it('should evaluate a hexadecimal unsigned integer with uppercase', () => {
    expect(evaluate('0xABCDU')).toBe(43981)
  })

  it('should handle unsigned integers with regular integers in calculations', () => {
    expect(evaluate('10u + 5')).toBe(15)
  })

  it('should handle hexadecimal numbers in calculations', () => {
    expect(evaluate('0xA + 5')).toBe(15)
  })

  it('should handle hexadecimal unsigned numbers with regular integers in calculations', () => {
    expect(evaluate('0xAu + 5')).toBe(15)
  })
})
