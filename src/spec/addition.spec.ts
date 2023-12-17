import { expect, describe, it } from 'vitest'

import { parse } from '..'
import { CelTypeError } from '../errors/CelTypeError'

describe('addition', () => {
  it('should parse addition', () => {
    const expr = '1 + 1'

    const result = parse(expr)

    expect(result).toBe(2)
  })

  it('should parse subtraction', () => {
    const expr = '1 - 1'

    const result = parse(expr)

    expect(result).toBe(0)
  })

  it('should parse addition with multiple terms', () => {
    const expr = '1 + 1 + 1'

    const result = parse(expr)

    expect(result).toBe(3)
  })

  it('should parse addition with multiple terms with different signs', () => {
    const expr = '1 + 1 - 1'

    const result = parse(expr)

    expect(result).toBe(1)
  })

  it('should parse float addition', () => {
    const expr = '0.333 + 0.333'

    const result = parse(expr)

    expect(result).toBe(0.666)
  })

  it('should concatenate strings', () => {
    const expr = '"a" + "b"'

    const result = parse(expr)

    expect(result).toBe('ab')
  })

  describe('should throw when', () => {
    it('is a boolean', () => {
      const expr = 'true + 1'

      const result = () => parse(expr)

      expect(result).toThrow(new CelTypeError('addition', true, 1))
    })

    it('is a null', () => {
      const expr = 'null + 1'

      const result = () => parse(expr)

      expect(result).toThrow(new CelTypeError('addition', null, 1))
    })
  })
})
