import { describe, it } from 'node:test'
import assert from 'node:assert'
import { parse } from './index.js'

describe('CEL', () => {
  describe('comparisons', () => {
    it('should parse greater than operator', () => {
      const expr = '2 > 1'

      const result = parse(expr)

      assert.strictEqual(result, true)
    })

    it('should parse less than operator', () => {
      const expr = '2 < 1'

      const result = parse(expr)

      assert.strictEqual(result, false)
    })
  })

  describe('identifiers', () => {
    it.only('should parse identifiers', () => {
      const expr = 'a > 1'
      const context = { a: { b: 2 } }

      const result = parse(expr, context)

      assert.strictEqual(result, true)
    })

    it('should throw if identifier is not in context', () => {
      const expr = 'a < 1'

      assert.throws(() => parse(expr))
    })
  })
})
