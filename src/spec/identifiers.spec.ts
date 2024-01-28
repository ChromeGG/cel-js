import { expect, describe, it } from 'vitest'
import { evaluate } from '..'

describe('identifiers', () => {
  describe('dot notation', () => {
    it('should evaluate single identifier', () => {
      const expr = 'a'
      const context = { a: 2 }

      const result = evaluate(expr, context)

      expect(result).toBe(2)
    })

    it('should evaluate nested identifiers', () => {
      const expr = 'a.b.c'
      const context = { a: { b: { c: 2 } } }

      const result = evaluate(expr, context)

      expect(result).toBe(2)
    })
  })

  describe('index notation', () => {
    it('should evaluate single identifier', () => {
      const expr = 'a["b"]'
      const context = { a: { b: 2 } }

      const result = evaluate(expr, context)

      expect(result).toBe(2)
    })

    it('should evaluate nested identifiers', () => {
      const expr = 'a["b"]["c"]'
      const context = { a: { b: { c: 2 } } }

      const result = evaluate(expr, context)

      expect(result).toBe(2)
    })
  })

  it('should evaluate identifiers - mixed', () => {
    const expr = 'a.b["c"].d'

    const context = { a: { b: { c: { d: 2 } } } }

    const result = evaluate(expr, context)

    expect(result).toBe(2)
  })

  it('should evaluate identifiers - multiple usage of the same identifiers', () => {
    const expr = 'a.b["c"].d + a.b["c"].d'

    const context = { a: { b: { c: { d: 2 } } } }

    const result = evaluate(expr, context)

    expect(result).toBe(4)
  })

  it('should return object if identifier is object', () => {
    const expr = 'a'
    const context = { a: { b: 2 } }

    const result = evaluate(expr, context)

    expect(result).toStrictEqual({ b: 2 })
  })

  it('should throw if access to identifier but w/o context', () => {
    const expr = 'a'

    const result = () => evaluate(expr)

    expect(result).toThrow(`Identifier "a" not found, no context passed`)
  })

  it('should throw if identifier is not in context', () => {
    const expr = 'a'

    const result = () => evaluate(expr, { b: 2 })

    expect(result).toThrow(`Identifier "a" not found in context: {"b":2}`)
  })
})
