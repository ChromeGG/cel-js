import { expect, describe, it } from 'vitest'

import { evaluate } from '..'

describe('lists expressions', () => {
  describe('integer', () => {
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

      it('should create a two element list', () => {
        const expr = '[1, 2]'

        const result = evaluate(expr)

        expect(result).toStrictEqual([1, 2])
    })
    it('should create a many element list', () => {
      const expr = '[1, 2, 3]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([1, 2, 3])
    })
  })
  describe('boolean', () => {
    it('should create a empty list', () => {
      const expr = '[]'
  
      const result = evaluate(expr)
  
      expect(result).toStrictEqual([])
      })
    it('should create a one element list', () => {
          const expr = '[true]'
      
          const result = evaluate(expr)
      
          expect(result).toStrictEqual([true])
      })

    it('should create a two element list', () => {
        const expr = '[true, false]'

        const result = evaluate(expr)

        expect(result).toStrictEqual([true, false])
    })
    it('should create a many element list', () => {
      const expr = '[true, false, true]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([true, false, true])
    })
  })
  describe('string', () => {
    it('should create a empty list', () => {
      const expr = '[]'
  
      const result = evaluate(expr)
  
      expect(result).toStrictEqual([])
      })
    it('should create a one element list', () => {
          const expr = '["foo"]'
      
          const result = evaluate(expr)
      
          expect(result).toStrictEqual(['foo'])
      })

    it('should create a two element list', () => {
        const expr = '["foo", "bar"]'

        const result = evaluate(expr)

        expect(result).toStrictEqual(['foo', 'bar'])
    })
    it('should create a many element list', () => {
      const expr = '["foo", "bar", "baz"]'

      const result = evaluate(expr)

      expect(result).toStrictEqual(['foo', 'bar', 'baz'])
    })
  })
  describe('lists', () => {
    it('should create a empty list', () => {
      const expr = '[]'
  
      const result = evaluate(expr)
  
      expect(result).toStrictEqual([])
      })
    it('should create a one element list', () => {
          const expr = '[[1]]'
      
          const result = evaluate(expr)
      
          expect(result).toStrictEqual([[1]])
      })

    it('should create a two element list', () => {
        const expr = '[[1], [2]]'

        const result = evaluate(expr)

        expect(result).toStrictEqual([[1], [2]])
    })
    it('should create a many element list', () => {
      const expr = '[[1], [2], [3]]'

      const result = evaluate(expr)

      expect(result).toStrictEqual([[1], [2], [3]])
    })
  })
  describe('index', () => {
    it('should access list by index', () => {
      const expr = 'a[0]'

      const context = { a: [1, 2, 3] }
  
      const result = evaluate(expr, context)

      expect(result).toBe(1)
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
  })
})