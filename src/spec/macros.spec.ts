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
