import { expect, describe, it } from 'vitest'

import { parse } from './index.js'
import { reservedIdentifiers } from './tokens.js'

describe('specification of CEL', () => {
  describe('comparisons', () => {
    it('should parse greater than operator', () => {
      const expr = '2 > 1'

      const result = parse(expr)

      expect(result).toBe(true)
    })

    it('should parse less than operator', () => {
      const expr = '2 < 1'

      const result = parse(expr)

      expect(result).toBe(false)
    })

    it('should parse greater than or equal operator', () => {
      const expr = '1 >= 1'
      const result = parse(expr)

      expect(result).toBe(true)
    })

    it('should parse less than or equal operator', () => {
      const expr = '1 <= 1'

      const result = parse(expr)

      expect(result).toBe(true)
    })
  })

  describe('identifiers', () => {
    it('should parse identifiers', () => {
      const expr = 'a > 1'
      const context = { a: 2 }

      const result = parse(expr, context)

      expect(result).toBe(true)
    })

    it('should throw if identifier is not in context', () => {
      const expr = 'a < 1'

      const result = () => parse(expr)

      expect(result).toThrow(`Identifier "a" not found, no context passed`)
    })

    it('should throw if identifier is not in context', () => {
      const expr = 'a < 1'

      const result = () => parse(expr, { b: 2 })

      expect(result).toThrow(`Identifier "a" not found in context: {"b":2}`)
    })
  })

  describe('reserved identifiers', () => {
    it.each(reservedIdentifiers)(
      'should throw if reserved identifier "%s" is used',
      (identifier) => {
        const expr = `${identifier} < 1`

        const result = () => parse(expr)

        expect(result).toThrow(
          `Detected reserved identifier. This is not allowed`
        )
      }
    )
  })

  describe('addition', () => {
    it('should parse addition', () => {
      const expr = '1 + 1'

      const result = parse(expr)

      expect(result).toBe(2)
    })

    it('should parse addition with multiple terms', () => {
      const expr = '1 + 1 + 1'

      const result = parse(expr)

      expect(result).toBe(3)
    })

    it('should parse addition with multiple terms with different signs', () => {
      const expr = '1 + 1 - 1'

      const result = parse(expr)

      expect(result).toBe(1)
    })
  })
})
