import { describe, expect, it } from 'vitest'
import { evaluate } from '../index.js'
import { CelTypeError } from '../errors/CelTypeError.js'

describe('Unary Operators', () => {
  describe('Logical negation (!)', () => {
    it('should negate boolean values correctly', () => {
      expect(evaluate('!true')).toBe(false)
      expect(evaluate('!false')).toBe(true)
      expect(evaluate('!!true')).toBe(true)
      expect(evaluate('!!false')).toBe(false)
      expect(evaluate('!!!true')).toBe(false)
    })

    it('should handle null values correctly', () => {
      expect(evaluate('!null')).toBe(true)
      expect(evaluate('!!null')).toBe(false)
      expect(evaluate('!!!null')).toBe(true)
    })

    it('should throw error when used with non-boolean, non-null values', () => {
      expect(() => evaluate('!"string"')).toThrow(
        new CelTypeError('logical negation', 'string', null),
      )

      expect(() => evaluate('!123')).toThrow(
        new CelTypeError('logical negation', 123, null),
      )

      expect(() => evaluate('![]')).toThrow(
        new CelTypeError('logical negation', [], null),
      )

      expect(() => evaluate('!{}')).toThrow(
        new CelTypeError('logical negation', {}, null),
      )
    })
  })

  describe('Arithmetic negation (-)', () => {
    it('should negate numeric values correctly', () => {
      expect(evaluate('-5')).toBe(-5)
      expect(evaluate('--5')).toBe(5)
      expect(evaluate('---5')).toBe(-5)
      expect(evaluate('-0')).toBe(0)
      expect(evaluate('-3.14')).toBe(-3.14)
    })

    it('should throw error when used with non-numeric values', () => {
      expect(() => evaluate('-"string"')).toThrow(
        new CelTypeError('arithmetic negation', 'string', null),
      )

      expect(() => evaluate('-true')).toThrow(
        new CelTypeError('arithmetic negation', true, null),
      )

      expect(() => evaluate('-null')).toThrow(
        new CelTypeError('arithmetic negation', null, null),
      )

      expect(() => evaluate('-[]')).toThrow(
        new CelTypeError('arithmetic negation', [], null),
      )

      expect(() => evaluate('-{}')).toThrow(
        new CelTypeError('arithmetic negation', {}, null),
      )
    })
  })

  describe('Integration with other operators', () => {
    it('should work with comparison operators', () => {
      expect(evaluate('!true == false')).toBe(true)
      expect(evaluate('!(5 > 3) == false')).toBe(true)
      expect(evaluate('-5 < 0')).toBe(true)
    })

    it('should work with conditional operators', () => {
      expect(evaluate('!true ? "yes" : "no"')).toBe('no')
      expect(evaluate('!false ? "yes" : "no"')).toBe('yes')
      expect(evaluate('!null ? "yes" : "no"')).toBe('yes')
    })

    it('should respect operator precedence', () => {
      expect(evaluate('!true || true')).toBe(true) // (!true) || true
      expect(evaluate('!(true || true)')).toBe(false) // !(true || true)
      expect(evaluate('-5 + 3')).toBe(-2) // (-5) + 3
    })
  })
})
