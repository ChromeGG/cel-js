import { expect, describe, it } from 'vitest'

import { CelEvaluationError, CelTypeError, evaluate } from '..'
import { Operations } from '../helper'

describe('lists expressions', () => {
  describe('literals', () => {
    it('should create a empty list', () => {
      const expr = '[]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([])
    })

    it('should create a one element list', () => {
      const expr = '[1]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([1])
    })

    it('should create a many element list', () => {
      const expr = '[1, 2, 3]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([1, 2, 3])
    })

    // Shall we throw an error if lists have different types?

  })

  describe('lists', () => {
    it('should create a one element list', () => {
      const expr = '[[1]]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([[1]])
    })

    it('should create a many element list', () => {
      const expr = '[[1], [2], [3]]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([[1], [2], [3]])
    })
  })

  describe('index', () => {
    it('should access list by index', () => {
      const expr = 'a[1]'

      const context = { a: [1, 2, 3] }

      const result = evaluate(expr, context)

      expect(result).toBe(2)
    })

    it('should access list by index if literal used', () => {
      const expr = '[1, 2, 3][1]'

      const context = { a: [1, 2, 3] }

      const result = evaluate(expr, context)

      expect(result).toBe(2)
    })

    it('should access list on zero index', () => {
      const expr = '[7, 8, 9][0]'

      const result = evaluate(expr)

      expect(result).toBe(7)
    })

    it('should access first element if index 0.0', () => {
      const expr = '[7, 8, 9][0.0]'

      const result = evaluate(expr)

      expect(result).toBe(7)
    })

    it('should throw error on index 0.1', () => {
      const expr = '[7, 8, 9][0.1]'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelEvaluationError('invalid_argument'))
    })

    it('should access list a singleton', () => {
      const expr = '["foo"][0]'

      const result = evaluate(expr)

      expect(result).toBe('foo')
    })

    it('should access list on the last index', () => {
      const expr = '[7, 8, 9][2]'

      const result = evaluate(expr)

      expect(result).toBe(9)
    })

    it('should access the list on middle values', () => {
      const expr = '[0, 1, 1, 2, 3, 5, 8, 13][4]'

      const result = evaluate(expr)

      expect(result).toBe(3)
    })

    it('should throw an error if index out of bounds', () => {
      const expr = '[1][5]'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelEvaluationError('invalid_argument'))
    })
  })

  describe('concatenation', () => {
    it('should concatenate two lists', () => {
      const expr = '[1, 2] + [3, 4]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([1, 2, 3, 4])
    })

    it('should concatenate two lists with the same element', () => {
      const expr = '[2] + [2]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([2, 2])
    })

    it('should return empty list if both elements are empty', () => {
      const expr = '[] + []'

      const result = evaluate(expr)

      expect(result).toStrictEqual([])
    })

    it('should return correct list if left side is empty', () => {
      const expr = '[] + [1, 2]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([1, 2])
    })

    it('should return correct list if right side is empty', () => {
      const expr = '[1, 2] + []'

      const result = evaluate(expr)

      expect(result).toStrictEqual([1, 2])
    })

    it('should throw an error if lists have different types', () => {
      const expr = '[1] + [true]'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.addition, 1, true))
    })
  })
})
