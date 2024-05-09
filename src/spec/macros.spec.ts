import { expect, describe, it } from 'vitest'

import { CelEvaluationError, CelTypeError, evaluate } from '..'
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

describe('custom functions', () => {
  describe('single argument', () => {
    it('should execute a single argument custom function', () => {
      const expr = 'foo(bar)'

      const foo = (arg) => {
        return `foo:${arg}`
      }

      const result = evaluate(expr, {bar: "bar"}, {foo: foo})

      expect(result).toBe("foo:bar")
    })
  })

  describe('multi argument', () => {
    it('should execute a two argument custom function', () => {
      const expr = 'foo(bar, 42)'

      const foo = (thing, intensity) => {
        return `foo:${thing} ${intensity}`
      }

      const result = evaluate(expr, {bar: "bar"}, {foo: foo})

      expect(result).toBe("foo:bar 42")
    })

    it('should execute a three argument custom function', () => {
      const expr = 'foo(bar, 42, true)'

      const foo = (thing, intensity, enable) => {
        return `foo:${thing} ${intensity} ${enable}`
      }

      const result = evaluate(expr, {bar: "bar"}, {foo: foo})

      expect(result).toBe("foo:bar 42 true")
    })
  })

  describe('interaction with default functions', () => {
    it('should preserve default functions when custom functions specified', () => {
      const expr = 'foo(bar, size("ubernete"), true)'

      const foo = (thing, intensity, enable) => {
        return `foo:${thing} ${intensity} ${enable}`
      }

      const result = evaluate(expr, {bar: "bar"}, {foo: foo})

      expect(result).toBe("foo:bar 8 true")
    })

    it('should allow overriding default functions', () => {
      const expr = 'foo(bar, size("ubernete"), true)'

      const foo = (thing, intensity, enable) => {
        return `foo:${thing} ${intensity} ${enable}`
      }

      const result = evaluate(expr, {bar: "bar"}, {foo: foo, size: () => "strange"})

      expect(result).toBe("foo:bar strange true")
    })
  })

  describe('unknown functions', () => {
    it('should throw when an unknown function is called', () => {
      const expr = 'foo(bar)'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelEvaluationError('Macros foo not recognized'))
    })

    it('should not treat context values as first-class functions', () => {
      const expr = 'foo(bar)'

      const result = () => evaluate(expr, {foo: 'foo', bar: 'bar'})

      expect(result).toThrow(new CelEvaluationError('Macros foo not recognized'))
    })
  })
})
