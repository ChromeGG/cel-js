import { expect, describe, it } from 'vitest'

import { evaluate } from '..'

describe('atomic expressions', () => {
  it('should evaluate a number', () => {
    const expr = '1'

    const result = evaluate(expr)

    expect(result).toBe(1)
  })

  it('should evaluate a hexadecimal number', () => {
    const expr = '0xA'

    const result = evaluate(expr)

    expect(result).toBe(10)
  })

  it('should evaluate a true boolean literal', () => {
    const expr = 'true'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate a false boolean literal', () => {
    const expr = 'false'

    const result = evaluate(expr)

    expect(result).toBe(false)
  })

  it('should evaluate null literal', () => {
    const expr = 'null'

    const result = evaluate(expr)

    expect(result).toBeNull()
  })

  it('should evaluate a string literal', () => {
    const expr = '"foo"'

    const result = evaluate(expr)

    expect(result).toBe('foo')
  })

  it('should evaluate a float', () => {
    const expr = '1.2'

    const result = evaluate(expr)

    expect(result).toBe(1.2)
  })
})
