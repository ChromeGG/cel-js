import { expect, describe, it } from 'vitest'

import { parse } from '..'

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

  it('should parse equal operator', () => {
    const expr = '1 == 1'

    const result = parse(expr)

    expect(result).toBe(true)
  })

  it('should parse not equal operator', () => {
    const expr = '1 != 1'

    const result = parse(expr)

    expect(result).toBe(false)
  })

  describe('logical operators', () => {
    describe('AND', () => {
      it('should return true if second expressions are true', () => {
        const expr = 'true && true'

        const result = parse(expr)

        expect(result).toBe(true)
      })

      it('should return false if second expression is false', () => {
        const expr = 'true && false'

        const result = parse(expr)

        expect(result).toBe(false)
      })

      it('should return true if all expressions are true', () => {
        const expr = 'true && true && true'

        const result = parse(expr)

        expect(result).toBe(true)
      })

      it('should return false if at least one expressions is false', () => {
        const expr = 'true && false && true'

        const result = parse(expr)

        expect(result).toBe(false)
      })
    })

    describe('OR', () => {
      it('should return true if at least one expression is true', () => {
        const expr = 'true || false'

        const result = parse(expr)

        expect(result).toBe(true)
      })

      it('should return false if all expressions are false', () => {
        const expr = 'false || false'

        const result = parse(expr)

        expect(result).toBe(false)
      })

      it('should return true if at least expression is true', () => {
        const expr = 'false || true || false'

        const result = parse(expr)

        expect(result).toBe(true)
      })
    })

    it('should be able to combine AND and OR', () => {
      const expr = 'true && true || false'

      const result = parse(expr)

      expect(result).toBe(true)
    })
  })
})
