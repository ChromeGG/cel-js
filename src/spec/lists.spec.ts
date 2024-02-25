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
    // The original implementation does that if we put literals
    // but no in case of context usage. So for now we will not throw an error
    it.todo('should throw an error if lists have different types', () => {
      const expr = '[1, true]'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.logicalAnd, true, 1))
    })
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

    it('should throw an error if index out of bounds', () => {
      const expr = '[1][5]'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelEvaluationError(`Index out of bounds: 5`))
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

    // Shall we throw an error if lists have different types?
    // The original implementation does that if we put literals
    // but no in case of context usage. So for now we will not throw an error
    it.todo('should throw an error if lists have different types', () => {
      const expr = '[1] + [true]'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.logicalAnd, true, 1))
    })
  })
})
