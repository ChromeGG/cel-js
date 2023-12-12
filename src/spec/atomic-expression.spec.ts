import { expect, describe, it } from 'vitest'

import { parse } from '..'

describe('atomic expressions', () => {
  it('should parse a number', () => {
    const expr = '1'

    const result = parse(expr)

    expect(result).toBe(1)
  })

  it('should parse a true boolean literal', () => {
    const expr = 'true'

    const result = parse(expr)

    expect(result).toBe(true)
  })

  it('should parse a false boolean literal', () => {
    const expr = 'false'

    const result = parse(expr)

    expect(result).toBe(false)
  })

  it('should parse null literal', () => {
    const expr = 'null'

    const result = parse(expr)

    expect(result).toBe(null)
  })

  it('should parse a string literal', () => {
    const expr = '"foo"'

    const result = parse(expr)

    expect(result).toBe('foo')
  })
})
