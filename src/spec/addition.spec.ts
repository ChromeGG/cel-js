import { expect, describe, it } from 'vitest'

import { parse } from '..'

describe('addition', () => {
  it('should parse addition', () => {
    const expr = '1 + 1'

    const result = parse(expr)

    expect(result).toBe(2)
  })

  it('should parse addition with multiple terms', () => {
    const expr = '1 + 1 + 1'

    const result = parse(expr)

    expect(result).toBe(3)
  })

  it('should parse addition with multiple terms with different signs', () => {
    const expr = '1 + 1 - 1'

    const result = parse(expr)

    expect(result).toBe(1)
  })
})
