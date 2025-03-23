import { describe, expect, it } from 'vitest'
import { evaluate } from '../index.js'

describe('Ternary Operator', () => {
  it('should handle simple ternary expressions', () => {
    expect(evaluate('true ? 1 : 2')).toBe(1)
    expect(evaluate('false ? 1 : 2')).toBe(2)
  })

  it('should handle complex conditions in ternary expressions', () => {
    expect(evaluate('1 < 2 ? "yes" : "no"')).toBe('yes')
    expect(evaluate('2 < 1 ? "yes" : "no"')).toBe('no')
    expect(evaluate('1 + 1 == 2 ? "correct" : "incorrect"')).toBe('correct')
  })

  it('should handle nested ternary expressions - true case', () => {
    expect(evaluate('true ? (true ? 1 : 2) : 3')).toBe(1)
    expect(evaluate('true ? (false ? 1 : 2) : 3')).toBe(2)
  })

  it('should handle nested ternary expressions - false case', () => {
    expect(evaluate('false ? 1 : (true ? 2 : 3)')).toBe(2)
    expect(evaluate('false ? 1 : (false ? 2 : 3)')).toBe(3)
  })

  it('should handle complex expressions in all parts of the ternary', () => {
    expect(evaluate('1 + 1 == 2 ? 3 * 2 : 5 * 2')).toBe(6)
    expect(evaluate('1 + 1 != 2 ? 3 * 2 : 5 * 2')).toBe(10)
  })

  it('should work with variables', () => {
    expect(
      evaluate('user.admin ? "Admin" : "User"', { user: { admin: true } }),
    ).toBe('Admin')
    expect(
      evaluate('user.admin ? "Admin" : "User"', { user: { admin: false } }),
    ).toBe('User')
  })

  it('should support logical operators in condition', () => {
    expect(evaluate('true && true ? "yes" : "no"')).toBe('yes')
    expect(evaluate('true && false ? "yes" : "no"')).toBe('no')
    expect(evaluate('false || true ? "yes" : "no"')).toBe('yes')
    expect(evaluate('false || false ? "yes" : "no"')).toBe('no')
  })

  it('should handle null conditions properly', () => {
    expect(evaluate('null ? "true" : "false"')).toBe('false')
    expect(evaluate('!null ? "true" : "false"')).toBe('true')
  })
})
