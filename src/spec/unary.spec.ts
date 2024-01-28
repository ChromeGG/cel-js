import { expect, describe, it } from 'vitest'
import { evaluate } from '..'

describe('unary', () => {
  it('should handle negative number expression', () => {
    const expr = '-1'

    const result = evaluate(expr)

    expect(result).toBe(-1)
  })

  // yes, this is a valid expression ...
  it('should handle multiple negative number expressions', () => {
    const expr = '--1'

    const result = evaluate(expr)

    expect(result).toBe(1)
  })

  it('should handle logical not expression', () => {
    const expr = '!true'

    const result = evaluate(expr)

    expect(result).toBe(false)
  })

  it('should handle multiple logical not expressions', () => {
    const expr = '!!true'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })
})
