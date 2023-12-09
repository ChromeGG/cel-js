import { expect, describe, it } from 'vitest'
import { parse } from '..'

describe('identifiers', () => {
  it('should parse identifiers', () => {
    const expr = 'a > 1'
    const context = { a: 2 }

    const result = parse(expr, context)

    expect(result).toBe(true)
  })

  it('should throw if identifier is not in context', () => {
    const expr = 'a < 1'

    const result = () => parse(expr)

    expect(result).toThrow(`Identifier "a" not found, no context passed`)
  })

  it('should throw if identifier is not in context', () => {
    const expr = 'a < 1'

    const result = () => parse(expr, { b: 2 })

    expect(result).toThrow(`Identifier "a" not found in context: {"b":2}`)
  })
})
