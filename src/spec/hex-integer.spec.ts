import { expect, describe, it } from 'vitest'
import { evaluate } from '..'

describe('hexadecimal integers', () => {
  it('should evaluate a simple hex integer', () => {
    expect(evaluate('0xA')).toBe(10)
  })

  it('should evaluate a hex integer with lowercase', () => {
    expect(evaluate('0xabc')).toBe(2748)
  })

  it('should handle hex integers in comparison operations', () => {
    expect(evaluate('0xA > 0x5')).toBe(true)
  })

  it('should handle hex integers in lists', () => {
    expect(evaluate('[0xA, 0x14, 0x1E][1]')).toBe(20) // 0x14 = 20
  })

  it('should evaluate hex unsigned integers with uppercase suffix', () => {
    const result = evaluate('0xAU')
    expect(Number(result)).toBe(10)
    expect(result.valueOf()).toBe(10)
  })

  it('should handle hex unsigned integers in arithmetic operations', () => {
    expect(evaluate('0xAu + 10')).toBe(20)
  })
})
