import { expect, describe, it } from 'vitest'

import { evaluate } from '..'
import { CelTypeError } from '../errors/CelTypeError'
import { Operations } from '../helper'
import { CelEvaluationError } from '../errors/CelEvaluationError'

describe('multiplication', () => {
  it('should evaluate multiplication', () => {
    const expr = '2 * 3'

    const result = evaluate(expr)

    expect(result).toBe(6)
  })

  it('should evaluate division', () => {
    const expr = '6 / 3'

    const result = evaluate(expr)

    expect(result).toBe(2)
  })

  it('should evaluate modulo', () => {
    const expr = '6 % 4'

    const result = evaluate(expr)

    expect(result).toBe(2)
  })

  it('should evaluate multiplication with multiple terms', () => {
    const expr = '2 * 3 * 4'

    const result = evaluate(expr)

    expect(result).toBe(24)
  })

  it('should evaluate multiplication with multiple terms with different signs', () => {
    const expr = '2 * 3 / 3'

    const result = evaluate(expr)

    expect(result).toBe(2)
  })

  describe('should throw when', () => {
    it('is a boolean', () => {
      const expr = 'true * 1'

      const result = () => evaluate(expr)

      expect(result).toThrow(
        new CelTypeError(Operations.multiplication, true, 1)
      )
    })

    it('is a null', () => {
      const expr = 'null / 1'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.division, null, 1))
    })

    it('is dividing by 0', () => {
      const expr = '1 / 0'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelEvaluationError('Division by zero'))
    })

    it('is modulo by 0', () => {
      const expr = '1 % 0'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelEvaluationError('Modulus by zero'))
    })
  })
})
