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
})
