import { expect, describe, it } from 'vitest'
import { evaluate } from '..'

describe('unsigned integers', () => {
  it('should evaluate a simple unsigned integer', () => {
    const result = evaluate('123u')
    expect(Number(result)).toBe(123)
    expect(result.valueOf()).toBe(123)
  })

  it('should evaluate a uppercase U unsigned integer', () => {
    const result = evaluate('456U')
    expect(Number(result)).toBe(456)
    expect(result.valueOf()).toBe(456)
  })

  it('should evaluate zero as unsigned integer', () => {
    const result = evaluate('0u')
    expect(Number(result)).toBe(0)
    expect(result.valueOf()).toBe(0)
  })

  it('should preserve the unsigned integer type in calculations', () => {
    expect(evaluate('10u + 5')).toBe(15)
  })

  it('should handle unsigned integers in comparisons', () => {
    expect(evaluate('100u > 50')).toBe(true)
  })

  it('should evaluate a hexadecimal unsigned integer with uppercase', () => {
    const result = evaluate('0xABCDU')
    expect(Number(result)).toBe(43981)
    expect(result.valueOf()).toBe(43981)
  })
})
