import { expect, describe, it } from 'vitest'

import { CelTypeError, evaluate } from '..'
import { Operations } from '../helper'

describe('lists expressions', () => {
  describe('has', () => {
    it('should return true when nested property exists', () => {
      const expr = 'has(object.property)'

      const result = evaluate(expr, { object: { property: true } })

      expect(result).toBe(true)
    })

    it('should return false when property does not exists', () => {
      const expr = 'has(object.nonExisting)'

      const result = evaluate(expr, { object: { property: true } })

      expect(result).toBe(false)
    })

    it('should return false when property does not exists, combined with property usage', () => {
      const expr = 'has(object.nonExisting) && object.nonExisting'

      const result = evaluate(expr, { object: { property: true } })

      expect(result).toBe(false)
    })

    it('should throw when no arguments are passed', () => {
      const expr = 'has()'
      const context = { object: { property: true } }

      expect(() => evaluate(expr, context)).toThrow(
        'has() requires exactly one argument',
      )
    })

    it('should throw when argument is not an object', () => {
      const context = { object: { property: true } }
      const errorMessages = 'has() requires a field selection'

      expect(() => evaluate('has(object)', context)).toThrow(errorMessages)

      expect(() => evaluate('has(object[0])', context)).toThrow(errorMessages)

      expect(() => evaluate('has(object[property])', context)).toThrow(
        errorMessages,
      )
    })

    describe('should throw when argument is an atomic expresion of type', () => {
      const errorMessages = 'has() does not support atomic expressions'
      const context = { object: { property: true } }

      it('string', () => {
        expect(() => evaluate('has("")', context)).toThrow(errorMessages)

        expect(() => evaluate('has("string")', context)).toThrow(errorMessages)
      })

      it('array', () => {
        expect(() => evaluate('has([])', context)).toThrow(errorMessages)

        expect(() => evaluate('has([1, 2, 3])', context)).toThrow(errorMessages)
      })

      it('boolean', () => {
        expect(() => evaluate('has(true)', context)).toThrow(errorMessages)

        expect(() => evaluate('has(false)', context)).toThrow(errorMessages)
      })

      it('number', () => {
        expect(() => evaluate('has(42)', context)).toThrow(errorMessages)

        expect(() => evaluate('has(0)', context)).toThrow(errorMessages)

        expect(() => evaluate('has(0.3)', context)).toThrow(errorMessages)
      })
    })
  })

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

  describe('all', () => {
    describe('list', () => {
      it('should return true when all elements satisfy condition', () => {
        const expr = '[1, 2, 3].all(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when not all elements satisfy condition', () => {
        const expr = '[1, 2, 3].all(v, v > 2)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should return true for empty list (vacuous truth)', () => {
        const expr = '[].all(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should work with string elements', () => {
        const expr = '["hello", "world"].all(s, size(s) > 3)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should work with boolean elements', () => {
        const expr = '[true, true, true].all(b, b)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when at least one element fails condition', () => {
        const expr = '[true, false, true].all(b, b)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should work with complex conditions', () => {
        const expr = '[10, 20, 30].all(n, n % 10 == 0)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should work with variable from context', () => {
        const expr = 'numbers.all(n, n > threshold)'

        const result = evaluate(expr, { numbers: [5, 10, 15], threshold: 4 })

        expect(result).toBe(true)
      })

      it('should work with nested all calls', () => {
        const expr = '[[1, 2], [3, 4]].all(arr, arr.all(n, n > 0))'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })
    })

    describe('map', () => {
      it('should return true when all values satisfy condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.all(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when not all values satisfy condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.all(v, v > 2)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should return true for empty map', () => {
        const expr = '{}.all(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })
    })

    describe('error cases', () => {
      it('should throw when called on non-collection', () => {
        const expr = '42.all(v, v > 0)'

        const result = () => evaluate(expr)

        expect(result).toThrow('Given string is not a valid CEL expression')
      })

      it('should throw when predicate is missing', () => {
        const expr = '[1, 2, 3].all(v)'

        const result = () => evaluate(expr)

        expect(result).toThrow('all() requires exactly two arguments: variable and predicate')
      })
    })
  })

  describe('exists', () => {
    describe('list', () => {
      it('should return true when at least one element satisfies condition', () => {
        const expr = '[1, 2, 3].exists(v, v > 2)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when no elements satisfy condition', () => {
        const expr = '[1, 2, 3].exists(v, v > 5)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should return false for empty list', () => {
        const expr = '[].exists(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should work with string elements', () => {
        const expr = '["hello", "world"].exists(s, size(s) > 4)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should work with boolean elements', () => {
        const expr = '[false, false, true].exists(b, b)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when all elements fail condition', () => {
        const expr = '[false, false, false].exists(b, b)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should work with complex conditions', () => {
        const expr = '[11, 21, 30].exists(n, n % 10 == 0)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should work with variable from context', () => {
        const expr = 'numbers.exists(n, n > threshold)'

        const result = evaluate(expr, { numbers: [1, 2, 15], threshold: 10 })

        expect(result).toBe(true)
      })

      it('should work with nested exists calls', () => {
        const expr = '[[1, 0], [3, 4]].exists(arr, arr.exists(n, n == 0))'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should short-circuit on first match', () => {
        const expr = '[1, 2, 3, 4, 5].exists(v, v == 2)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })
    })

    describe('map', () => {
      it('should return true when at least one value satisfies condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.exists(v, v > 2)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when no values satisfy condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.exists(v, v > 5)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should return false for empty map', () => {
        const expr = '{}.exists(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })
    })

    describe('error cases', () => {
      it('should throw when called on non-collection', () => {
        const expr = '42.exists(v, v > 0)'

        const result = () => evaluate(expr)

        expect(result).toThrow('Given string is not a valid CEL expression')
      })

      it('should throw when predicate is missing', () => {
        const expr = '[1, 2, 3].exists(v)'

        const result = () => evaluate(expr)

        expect(result).toThrow('exists() requires exactly two arguments: variable and predicate')
      })
    })
  })

  describe('exists_one', () => {
    describe('list', () => {
      it('should return true when exactly one element satisfies condition', () => {
        const expr = '[1, 2, 3].exists_one(v, v > 2)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when no elements satisfy condition', () => {
        const expr = '[1, 2, 3].exists_one(v, v > 5)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should return false when multiple elements satisfy condition', () => {
        const expr = '[1, 2, 3].exists_one(v, v > 1)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should return false for empty list', () => {
        const expr = '[].exists_one(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should work with string elements', () => {
        const expr = '["hello", "world", "hi"].exists_one(s, size(s) == 2)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should work with boolean elements - exactly one true', () => {
        const expr = '[false, true, false].exists_one(b, b)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when multiple boolean elements are true', () => {
        const expr = '[true, true, false].exists_one(b, b)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should work with complex conditions', () => {
        const expr = '[11, 21, 30, 25].exists_one(n, n % 10 == 0)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when multiple elements match complex condition', () => {
        const expr = '[10, 20, 30].exists_one(n, n % 10 == 0)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should work with variable from context', () => {
        const expr = 'numbers.exists_one(n, n > threshold)'

        const result = evaluate(expr, { numbers: [1, 2, 15, 8], threshold: 10 })

        expect(result).toBe(true)
      })

      it('should work with nested exists_one calls', () => {
        const expr = '[[1, 0], [3, 4], [5, 6]].exists_one(arr, arr.exists_one(n, n == 0))'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should handle edge case with single element list', () => {
        const expr = '[42].exists_one(v, v == 42)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when single element does not match', () => {
        const expr = '[42].exists_one(v, v == 99)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })
    })

    describe('map', () => {
      it('should return true when exactly one value satisfies condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.exists_one(v, v > 2)'

        const result = evaluate(expr)

        expect(result).toBe(true)
      })

      it('should return false when no values satisfy condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.exists_one(v, v > 5)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should return false when multiple values satisfy condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.exists_one(v, v > 1)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })

      it('should return false for empty map', () => {
        const expr = '{}.exists_one(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toBe(false)
      })
    })

    describe('error cases', () => {
      it('should throw when called on non-collection', () => {
        const expr = '42.exists_one(v, v > 0)'

        const result = () => evaluate(expr)

        expect(result).toThrow('Given string is not a valid CEL expression')
      })

      it('should throw when predicate is missing', () => {
        const expr = '[1, 2, 3].exists_one(v)'

        const result = () => evaluate(expr)

        expect(result).toThrow('exists_one() requires exactly two arguments: variable and predicate')
      })
    })
  })

  describe('filter', () => {
    describe('list', () => {
      it('should return filtered array with elements that satisfy condition', () => {
        const expr = '[1, 2, 3, 4, 5].filter(v, v > 3)'

        const result = evaluate(expr)

        expect(result).toEqual([4, 5])
      })

      it('should return empty array when no elements satisfy condition', () => {
        const expr = '[1, 2, 3].filter(v, v > 5)'

        const result = evaluate(expr)

        expect(result).toEqual([])
      })

      it('should return all elements when all satisfy condition', () => {
        const expr = '[1, 2, 3].filter(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toEqual([1, 2, 3])
      })

      it('should return empty array for empty list', () => {
        const expr = '[].filter(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toEqual([])
      })

      it('should work with string elements', () => {
        const expr = '["hello", "world", "hi", "test"].filter(s, size(s) > 3)'

        const result = evaluate(expr)

        expect(result).toEqual(["hello", "world", "test"])
      })

      it('should work with boolean elements', () => {
        const expr = '[true, false, true, false].filter(b, b)'

        const result = evaluate(expr)

        expect(result).toEqual([true, true])
      })

      it('should work with complex conditions', () => {
        const expr = '[10, 15, 20, 25, 30].filter(n, n % 10 == 0)'

        const result = evaluate(expr)

        expect(result).toEqual([10, 20, 30])
      })

      it('should work with variable from context', () => {
        const expr = 'numbers.filter(n, n > threshold)'

        const result = evaluate(expr, { numbers: [1, 8, 15, 3, 12], threshold: 10 })

        expect(result).toEqual([15, 12])
      })

      it('should work with nested filter calls', () => {
        const expr = '[[1, 2], [3, 4], [5, 6]].filter(arr, arr.filter(n, n > 3) != [])'

        const result = evaluate(expr)

        expect(result).toEqual([[3, 4], [5, 6]])
      })

      it('should preserve order of elements', () => {
        const expr = '[5, 1, 8, 3, 9, 2].filter(v, v > 4)'

        const result = evaluate(expr)

        expect(result).toEqual([5, 8, 9])
      })

      it('should work with numbers only', () => {
        const expr = '[1, 3, 5, 7, 2].filter(v, v > 2)'

        const result = evaluate(expr)

        expect(result).toEqual([3, 5, 7])
      })
    })

    describe('map', () => {
      it('should return filtered map with values that satisfy condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3, "d": 4}.filter(v, v > 2)'

        const result = evaluate(expr)

        expect(result).toEqual({"c": 3, "d": 4})
      })

      it('should return empty map when no values satisfy condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.filter(v, v > 5)'

        const result = evaluate(expr)

        expect(result).toEqual({})
      })

      it('should return all entries when all values satisfy condition', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.filter(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toEqual({"a": 1, "b": 2, "c": 3})
      })

      it('should return empty map for empty map', () => {
        const expr = '{}.filter(v, v > 0)'

        const result = evaluate(expr)

        expect(result).toEqual({})
      })

      it('should work with string values', () => {
        const expr = '{"name": "John", "city": "NYC", "age": "25", "country": "USA"}.filter(v, size(v) >= 3)'

        const result = evaluate(expr)

        expect(result).toEqual({"name": "John", "city": "NYC", "country": "USA"})
      })

      it('should preserve key-value relationships', () => {
        const expr = '{"low": 1, "medium": 5, "high": 10}.filter(v, v >= 5)'

        const result = evaluate(expr)

        expect(result).toEqual({"medium": 5, "high": 10})
      })
    })

    describe('error cases', () => {
      it('should throw when called on non-collection', () => {
        const expr = '42.filter(v, v > 0)'

        const result = () => evaluate(expr)

        expect(result).toThrow('Given string is not a valid CEL expression')
      })

      it('should throw when predicate is missing', () => {
        const expr = '[1, 2, 3].filter(v)'

        const result = () => evaluate(expr)

        expect(result).toThrow('filter() requires exactly two arguments: variable and predicate')
      })
    })
  })

  describe('map', () => {
    describe('list - two arguments (transform all)', () => {
      it('should transform all elements with simple expression', () => {
        const expr = '[1, 2, 3].map(v, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual([2, 4, 6])
      })

      it('should transform string elements', () => {
        const expr = '["hello", "world"].map(s, size(s))'

        const result = evaluate(expr)

        expect(result).toEqual([5, 5])
      })

      it('should transform with complex expressions', () => {
        const expr = '[1, 2, 3].map(v, v * v + 1)'

        const result = evaluate(expr)

        expect(result).toEqual([2, 5, 10])
      })

      it('should return empty array for empty list', () => {
        const expr = '[].map(v, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual([])
      })

      it('should work with variable from context', () => {
        const expr = 'numbers.map(n, n + offset)'

        const result = evaluate(expr, { numbers: [1, 2, 3], offset: 10 })

        expect(result).toEqual([11, 12, 13])
      })

      it('should preserve order', () => {
        const expr = '[5, 1, 3].map(v, v * 10)'

        const result = evaluate(expr)

        expect(result).toEqual([50, 10, 30])
      })

      it('should handle nested map calls', () => {
        const expr = '[[1, 2], [3, 4]].map(arr, arr.map(n, n * 2))'

        const result = evaluate(expr)

        expect(result).toEqual([[2, 4], [6, 8]])
      })
    })

    describe('list - three arguments (filter then transform)', () => {
      it('should filter and transform elements', () => {
        const expr = '[1, 2, 3, 4, 5].map(v, v > 2, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual([6, 8, 10])
      })

      it('should return empty array when no elements match predicate', () => {
        const expr = '[1, 2, 3].map(v, v > 5, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual([])
      })

      it('should transform all elements when all match predicate', () => {
        const expr = '[1, 2, 3].map(v, v > 0, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual([2, 4, 6])
      })

      it('should work with string filtering and transformation', () => {
        const expr = '["hello", "hi", "world"].map(s, size(s) > 2, size(s))'

        const result = evaluate(expr)

        expect(result).toEqual([5, 5])
      })

      it('should work with complex conditions and transformations', () => {
        const expr = '[1, 2, 3, 4, 5].map(n, n % 2 == 0, n * n)'

        const result = evaluate(expr)

        expect(result).toEqual([4, 16])
      })

      it('should work with variable from context', () => {
        const expr = 'numbers.map(n, n > threshold, n * multiplier)'

        const result = evaluate(expr, { numbers: [1, 5, 10, 15], threshold: 7, multiplier: 3 })

        expect(result).toEqual([30, 45])
      })
    })

    describe('map - two arguments (transform all)', () => {
      it('should transform all values', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.map(v, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual({"a": 2, "b": 4, "c": 6})
      })

      it('should transform string values', () => {
        const expr = '{"name": "John", "city": "NYC"}.map(v, size(v))'

        const result = evaluate(expr)

        expect(result).toEqual({"name": 4, "city": 3})
      })

      it('should return empty map for empty map', () => {
        const expr = '{}.map(v, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual({})
      })

      it('should preserve keys', () => {
        const expr = '{"x": 10, "y": 20}.map(v, v / 10)'

        const result = evaluate(expr)

        expect(result).toEqual({"x": 1, "y": 2})
      })
    })

    describe('map - three arguments (filter then transform)', () => {
      it('should filter and transform values', () => {
        const expr = '{"a": 1, "b": 2, "c": 3, "d": 4}.map(v, v > 2, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual({"c": 6, "d": 8})
      })

      it('should return empty map when no values match predicate', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.map(v, v > 5, v * 2)'

        const result = evaluate(expr)

        expect(result).toEqual({})
      })

      it('should transform all values when all match predicate', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}.map(v, v > 0, v + 10)'

        const result = evaluate(expr)

        expect(result).toEqual({"a": 11, "b": 12, "c": 13})
      })

      it('should work with string filtering and transformation', () => {
        const expr = '{"name": "John", "age": "25", "city": "NYC"}.map(v, size(v) > 3, size(v))'

        const result = evaluate(expr)

        expect(result).toEqual({"name": 4})
      })
    })

    describe('error cases', () => {
      it('should throw when called on non-collection', () => {
        const expr = '42.map(v, v * 2)'

        const result = () => evaluate(expr)

        expect(result).toThrow('Given string is not a valid CEL expression')
      })

      it('should throw when insufficient arguments (one argument)', () => {
        const expr = '[1, 2, 3].map(v)'

        const result = () => evaluate(expr)

        expect(result).toThrow('map() requires either two arguments (variable, transform) or three arguments (variable, predicate, transform)')
      })

      it('should throw when too many arguments (four arguments)', () => {
        const expr = '[1, 2, 3].map(v, v > 1, v * 2, v + 1)'

        const result = () => evaluate(expr)

        expect(result).toThrow('map() requires either two arguments (variable, transform) or three arguments (variable, predicate, transform)')
      })
    })
  })
})

describe('custom functions', () => {
  describe('single argument', () => {
    it('should execute a single argument custom function', () => {
      const expr = 'foo(bar)'

      const foo = (arg: unknown) => {
        return `foo:${arg}`
      }

      const result = evaluate(expr, { bar: 'bar' }, { foo })

      expect(result).toBe('foo:bar')
    })
  })

  describe('multi argument', () => {
    it('should execute a two argument custom function', () => {
      const expr = 'foo(bar, 42)'

      const foo = (thing: unknown, intensity: unknown) => {
        return `foo:${thing} ${intensity}`
      }

      const result = evaluate(expr, { bar: 'bar' }, { foo })

      expect(result).toBe('foo:bar 42')
    })
  })

  describe('interaction with default functions', () => {
    it('should preserve default functions when custom functions specified', () => {
      const expr = 'foo(bar, size("ubernete"), true)'

      const foo = (thing, intensity, enable) => {
        return `foo:${thing} ${intensity} ${enable}`
      }

      const result = evaluate(expr, { bar: 'bar' }, { foo: foo })

      expect(result).toBe('foo:bar 8 true')
    })

    it('should allow overriding default functions', () => {
      const expr = 'foo(bar, size("ubernete"), true)'

      const foo = (thing, intensity, enable) => {
        return `foo:${thing} ${intensity} ${enable}`
      }

      const result = evaluate(
        expr,
        { bar: 'bar' },
        { foo: foo, size: () => 'strange' },
      )

      expect(result).toBe('foo:bar strange true')
    })
  })

  describe('unknown functions', () => {
    it('should throw when an unknown function is called', () => {
      const expr = 'foo(bar)'

      const result = () => evaluate(expr)

      expect(result).toThrow('Macros foo not recognized')
    })

    it('should not treat context values as first-class functions', () => {
      const expr = 'foo(bar)'

      const result = () => evaluate(expr, { foo: 'foo', bar: 'bar' })

      expect(result).toThrow('Macros foo not recognized')
    })
  })
})
