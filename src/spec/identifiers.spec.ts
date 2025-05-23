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

  describe('reserved identifiers', () => {
    it('should throw if reserved identifier is used', () => {
      const expr = 'as'

      const result = () => evaluate(expr)

      expect(result).toThrow(`Detected reserved identifier. This is not allowed`)
    })

    it('should throw if reserved is used as a statment', () => {
      const expr = 'as + 1'

      const result = () => evaluate(expr)

      expect(result).toThrow(`Detected reserved identifier. This is not allowed`)
    })

    it('should not throw if reserved is at the start of the identifier', () => {
      const expr = 'as.b'

      const result = evaluate(expr, { as: { b: 2 } })

      expect(result).toBe(2)
    })

    it('should not throw if reserved is at the start of the identifier', () => {
      const expr = 'b.as'

      const result = evaluate(expr, { b: { as: 2 } })

      expect(result).toBe(2)
    })

    it('should not throw if reserved is start of an identifire string', () => {
      const expr = 'asx.b'  

      const result = evaluate(expr, { asx: { b: 2 } })

      expect(result).toBe(2)
    })

    it('should not throw if reserved is in the middle of an identifire string', () => {
      const expr = 'xasx.b'  

      const result = evaluate(expr, { xasx: { b: 2 } })

      expect(result).toBe(2)
    })

    it('should not throw if reserved is at the end of an identifire string', () => {
      const expr = 'xas.b'  

      const result = evaluate(expr, { xas: { b: 2 } })

      expect(result).toBe(2)
    })
  })
})
