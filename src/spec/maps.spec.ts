import { expect, describe, it } from 'vitest'
import { evaluate } from '..'

describe('maps expressions', () => {
  describe('literal', () => {
    it('should create a empty map', () => {
      const expr = '{}'

      const result = evaluate(expr)

      expect(result).toStrictEqual({})
    })

    it('should create a one element map', () => {
      const expr = '{"a": 1}'

      const result = evaluate(expr)

      expect(result).toStrictEqual({ a: 1 })
    })

    it('should create a many element map', () => {
      const expr = '{"a": 1, "b": 2, "c": 3}'

      const result = evaluate(expr)

      expect(result).toStrictEqual({ a: 1, b: 2, c: 3 })
    })

    it('should allow maps with different types (heterogeneous values)', () => {
      const expr = '{"a": 1, "b": true, "c": "string", "d": [1, 2, 3]}'

      const result = evaluate(expr)

      expect(result).toEqual({"a": 1, "b": true, "c": "string", "d": [1, 2, 3]})
    })
  })

  describe('index', () => {
    describe('dot expression', () => {
      it('should get the value of a key', () => {
        const expr = '{"a": 1}.a'

        const result = evaluate(expr)

        expect(result).toBe(1)
      })

      it('should throw an error if the key does not exist', () => {
        const expr = '{"a": 1}.b'

        const result = () => evaluate(expr)

        expect(result).toThrow('Identifier "b" not found, no context passed')
      })


    })
    describe('index expression', () => {
      it('should get the value of a key', () => {
        const expr = '{"a": 1}["a"]'

        const result = evaluate(expr)

        expect(result).toBe(1)
      })

      it('should throw an error if the key does not exist', () => {
        const expr = '{"a": 1}["b"]'

        const result = () => evaluate(expr)

        expect(result).toThrow('Identifier "b" not found, no context passed')
      })

      it('should throw an error if the key is not a string', () => {
        const expr = '{"a": 1}[1]'

        const result = () => evaluate(expr)

        expect(result).toThrow('Identifier "1" not found, no context passed')
      })
    })
  })

  describe('equal', () => {
    it('should compare two equal maps', () => {
      const expr = '{"c": 1, "a": 1, "b": 2} == {"a": 1, "b": 2, "c": 1}'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })
    it('should compare two different maps', () => {
      const expr = '{"a": 1, "b": 2} == {"a": 1, "b": 2, "c": 1}'

      const result = evaluate(expr)

      expect(result).toBe(false)
    })
  })
  describe('not equal', () => {
    it('should compare two equal maps', () => {
      const expr = '{"c": 1, "a": 1, "b": 2} != {"a": 1, "b": 2, "c": 1}'

      const result = evaluate(expr)

      expect(result).toBe(false)
    })
    it('should compare two different maps', () => {
      const expr = '{"a": 1, "b": 2} != {"a": 1, "b": 2, "c": 1}'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })
  })
  describe('in', () => {
    it('should find a key in the map', () => {
      const expr = '"c" in {"c": 1, "a": 1, "b": 2}'

      const result = evaluate(expr)

      expect(result).toBe(true)
    })
    it('should not find a key in the map', () => {
      const expr = '"z" in {"c": 1, "a": 1, "b": 2}'

      const result = evaluate(expr)

      expect(result).toBe(false)
    })
  })
})
