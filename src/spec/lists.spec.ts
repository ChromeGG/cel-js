import { expect, describe, it } from 'vitest'

import { CelTypeError, evaluate } from '..'
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

    it.todo('should throw an error if index out of bounds', () => {
      const expr = 'a[1]'

      const context = { a: [1] }

      const result = () => evaluate(expr, context)

      // TODO rather no CelTypeError
      expect(result).toThrow(new CelTypeError(Operations.logicalAnd, true, 1))
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

    it.todo('should throw an error if lists have different types', () => {
      const expr = '[1, 2] + [true, false]'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.logicalAnd, true, 1))
    })
  })

  describe('in', () => {
    it('should return false for element in empty list', () => {
      const expr = '1 in []'

      const result = evaluate(expr)

      expect(result).toBe(false)
    })

    it('should return true for element the only element on the list', () => {
      const expr = '1 in [1]'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })

    it('should return true for element the first element of the list', () => {
      const expr = '"first" in ["first", "second", "third"]'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })

    it('should return true for element a middle element of the list', () => {
      const expr = '3 in [5, 4, 3, 2, 1]'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })

    it('should return true for element the last element of the list', () => {
      const expr = '3 in [1, 2, 3]'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })

    it('should return false for element not in the list', () => {
      const expr = '3 in [1, 2]'

      const result = evaluate(expr)

      expect(result).toBe(false)
    })
  })

  describe('size', () => {
    it('should return 0 for empty list', () => {
      const expr = 'size([])'

      const result = evaluate(expr)

      expect(result).toBe(0)
    })

    it('should return 1 for one element list', () => {
      const expr = 'size([1])'

      const result = evaluate(expr)

      expect(result).toBe(1)
    })

    it('should return 3 for three element list', () => {
      const expr = 'size([1, 2, 3])'

      const result = evaluate(expr)

      expect(result).toBe(3)
    })
  })
})
