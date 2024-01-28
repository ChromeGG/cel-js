import { expect, describe, it } from 'vitest'

import { evaluate } from '..'
import { CelTypeError } from '../errors/CelTypeError'
import { Operations } from '../helper'

describe('addition', () => {
  it('should evaluate addition', () => {
    const expr = '1 + 1'

    const result = evaluate(expr)

    expect(result).toBe(2)
  })

  it('should evaluate subtraction', () => {
    const expr = '1 - 1'

    const result = evaluate(expr)

    expect(result).toBe(0)
  })

  it('should evaluate addition with multiple terms', () => {
    const expr = '1 + 1 + 1'

    const result = evaluate(expr)

    expect(result).toBe(3)
  })

  it('should evaluate addition with multiple terms with different signs', () => {
    const expr = '1 + 1 - 1'

    const result = evaluate(expr)

    expect(result).toBe(1)
  })

  it('should evaluate float addition', () => {
    const expr = '0.333 + 0.333'

    const result = evaluate(expr)

    expect(result).toBe(0.666)
  })

  it('should concatenate strings', () => {
    const expr = '"a" + "b"'

    const result = evaluate(expr)

    expect(result).toBe('ab')
  })

  describe('should throw when', () => {
    it('is a boolean', () => {
      const expr = 'true + 1'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.addition, true, 1))
    })

    it('is a null', () => {
      const expr = 'null + 1'

      const result = () => evaluate(expr)

      expect(result).toThrow(new CelTypeError(Operations.addition, null, 1))
    })
  })
})
