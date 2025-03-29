import { expect, describe, it } from 'vitest'
import { evaluate } from '..'

describe('hexadecimal integers', () => {
  it('should evaluate a simple hex integer', () => {
    expect(evaluate('0xA')).toBe(10)
  })

  it('should evaluate a larger hex integer', () => {
    expect(evaluate('0xFF')).toBe(255)
  })

  it('should evaluate a hex integer with lowercase', () => {
    expect(evaluate('0xabc')).toBe(2748)
  })

  it('should evaluate a hex integer with mixed case', () => {
    expect(evaluate('0xAbC')).toBe(2748)
  })

  it('should handle hex integers in arithmetic operations', () => {
    expect(evaluate('0xA + 5')).toBe(15)
  })

  it('should handle hex integers in multiplication', () => {
    expect(evaluate('0xA * 0x2')).toBe(20)
  })

  it('should handle hex integers in comparison operations', () => {
    expect(evaluate('0xA > 0x5')).toBe(true)
  })

  it('should handle hex integers in lists', () => {
    expect(evaluate('[0xA, 0x14, 0x1E][1]')).toBe(20) // 0x14 = 20
  })

  it('should evaluate hex unsigned integers', () => {
    expect(evaluate('0xAu')).toBe(10)
  })

  it('should evaluate hex unsigned integers with uppercase suffix', () => {
    expect(evaluate('0xAU')).toBe(10)
  })

  it('should handle hex unsigned integers in arithmetic operations', () => {
    expect(evaluate('0xAu + 10')).toBe(20)
  })

  it('should handle complex expressions with mixed hex and decimal numbers', () => {
    expect(evaluate('(0xA + 5) * (0x3u - 1)')).toBe(30) // (10 + 5) * (3 - 1) = 15 * 2 = 30
  })
})
