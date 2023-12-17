import { expect, describe, it } from 'vitest'

import { parse } from '..'
import { CelTypeError } from '../errors'

describe('multiplication', () => {
  it('should parse multiplication', () => {
    const expr = '2 * 3'

    const result = parse(expr)

    expect(result).toBe(6)
  })

  it('should parse division', () => {
    const expr = '6 / 3'

    const result = parse(expr)

    expect(result).toBe(2)
  })

  it('should parse modulo', () => {
    const expr = '6 % 4'

    const result = parse(expr)

    expect(result).toBe(2)
  })

  it('should parse multiplication with multiple terms', () => {
    const expr = '2 * 3 * 4'

    const result = parse(expr)

    expect(result).toBe(24)
  })

  it('should parse multiplication with multiple terms with different signs', () => {
    const expr = '2 * 3 / 3'

    const result = parse(expr)

    expect(result).toBe(2)
  })

  describe('should throw when', () => {
    it('is a boolean', () => {
      const expr = 'true * 1'

      const result = () => parse(expr)

      expect(result).toThrow(new CelTypeError('multiplication', true, 1))
    })

    it('is a null', () => {
      const expr = 'null / 1'

      const result = () => parse(expr)

      expect(result).toThrow(new CelTypeError('multiplication', null, 1))
    })
  })
})
