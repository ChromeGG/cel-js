import { expect, test, describe, it } from 'vitest'

import { parse } from './index.js'

describe('CEL', () => {
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

      expect(() => parse(expr)).toThrow()
    })
  })
})
