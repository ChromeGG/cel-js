import { expect, describe, it } from 'vitest'

import { CelTypeError, evaluate } from '..'
import { Operations } from '../helper'

describe('comparisons', () => {
  it('should evaluate greater than operator', () => {
    const expr = '2 > 1'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate less than operator', () => {
    const expr = '2 < 1'

    const result = evaluate(expr)

    expect(result).toBe(false)
  })

  it('should evaluate greater than or equal operator', () => {
    const expr = '1 >= 1'
    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate less than or equal operator', () => {
    const expr = '1 <= 1'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate equal operator', () => {
    const expr = '1 == 1'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate not equal operator', () => {
    const expr = '1 != 1'

    const result = evaluate(expr)

    expect(result).toBe(false)
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

    it('should thrown an error if used on something else than list', () => {
      const expr = '"a" in "asd"'

      const result = () => evaluate(expr)

      expect(result).toThrow(
        new CelTypeError(Operations.in, 'string', 'string')
      )
    })
  })
})
