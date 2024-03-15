import { expect, describe, it } from 'vitest'

import { CelTypeError, evaluate } from '..'
import { Operations } from '../helper'

describe('lists expressions', () => {
  describe('size', () => {
    describe('list', () => {
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

    describe('map', () => {
      it('should return 0 for empty map', () => {
        const expr = 'size({})'

        const result = evaluate(expr)

        expect(result).toBe(0)
      })

      it('should return 1 for one element map', () => {
        const expr = 'size({"a": 1})'

        const result = evaluate(expr)

        expect(result).toBe(1)
      })

      it('should return 3 for three element map', () => {
        const expr = 'size({"a": 1, "b": 2, "c": 3})'

        const result = evaluate(expr)

        expect(result).toBe(3)
      })
    })

    describe('string', () => {
      it('should return 0 for empty string', () => {
        const expr = 'size("")'

        const result = evaluate(expr)

        expect(result).toBe(0)
      })

      it('should return length of string', () => {
        const expr = 'size("abc")'

        const result = evaluate(expr)

        expect(result).toBe(3)
      })
    })

    it.todo('should thrown an error if operator is not string or list', () => {
      const expr = 'size(123)'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.addition, 123, 123))
    })
  })
})
