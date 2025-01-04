import { expect, describe, it } from 'vitest'

import { Success, evaluate, parse } from '..'
import { CelParseError } from '../errors/CelParseError'

describe('index.ts', () => {
  describe('parse', () => {
    it('should return isSuccess true and cst if given string is valid CEL string', () => {
      const expr = '1'

      const result = parse(expr)

      expect(result).toStrictEqual({
        isSuccess: true,
        cst: expect.any(Object)
      })
    })

    it('should return isSuccess false and errors if given string is not valid CEL string', () => {
      const expr = '1 +'

      const result = parse(expr)

      expect(result).toStrictEqual({
        isSuccess: false,
        errors: expect.any(Array)
      })
    })
  })

  describe('evaluate', () => {
    it('should throw an error if given string is not valid CEL expression', () => {
      const expr = '1 + '

      const result = () => evaluate(expr)

      expect(result).toThrow(CelParseError)
      expect(result).toThrow('Given string is not a valid CEL expression: ')
    })
  })

  it('should be able to reuse parse results in evaluate', () => {
    const expr = '1'

    const result = parse(expr)

    expect(() => evaluate((result as Success).cst)).not.toThrow()
  })
})
