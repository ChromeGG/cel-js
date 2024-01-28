import { expect, describe, it } from 'vitest'

import { evaluate } from '..'

describe('miscellaneous', () => {
  it('order of arithmetic operations', () => {
    const expr = '1 + 2 * 3 + 1'

    const result = evaluate(expr)

    expect(result).toBe(8)
  })

  describe('parenthesis', () => {
    it('should prioritize parenthesis expression', () => {
      const expr = '(1 + 2) * 3 + 1'

      const result = evaluate(expr)

      expect(result).toBe(10)
    })

    it('should allow multiple expressions', () => {
      const expr = '(1 + 2) * (3 + 1)'

      const result = evaluate(expr)

      expect(result).toBe(12)
    })
  })
})
