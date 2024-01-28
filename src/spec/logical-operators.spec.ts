import { expect, describe, it } from 'vitest'

import { evaluate } from '..'
import { CelTypeError } from '../errors/CelTypeError'
import { Operations } from '../helper'

describe('logical operators', () => {
  describe('AND', () => {
    it('should return true if second expressions are true', () => {
      const expr = 'true && true'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })

    it('should return false if second expression is false', () => {
      const expr = 'true && false'

      const result = evaluate(expr)

      expect(result).toBe(false)
    })

    it('should return true if all expressions are true', () => {
      const expr = 'true && true && true'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })

    it('should return false if at least one expressions is false', () => {
      const expr = 'true && false && true'

      const result = evaluate(expr)

      expect(result).toBe(false)
    })

    it('should throw an error if one of types is not boolean', () => {
      const expr = 'true && 1'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.logicalAnd, true, 1))
    })
  })

  describe('OR', () => {
    it('should return true if at least one expression is true', () => {
      const expr = 'true || false'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })

    it('should return false if all expressions are false', () => {
      const expr = 'false || false'

      const result = evaluate(expr)

      expect(result).toBe(false)
    })

    it('should return true if at least expression is true', () => {
      const expr = 'false || true || false'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })
  })

  it('should be able to combine AND and OR', () => {
    const expr = 'true && true || false'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should throw an error if one of types is not boolean', () => {
    const expr = 'true || 1'

    const result = () => evaluate(expr)

    expect(result).toThrow(new CelTypeError(Operations.logicalOr, true, 1))
  })
})
