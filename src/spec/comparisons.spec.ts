import { expect, describe, it } from 'vitest'

import { parse } from '..'

describe('comparisons', () => {
  it('should parse greater than operator', () => {
    const expr = '2 > 1'

    const result = parse(expr)

    expect(result).toBe(true)
  })

  it('should parse less than operator', () => {
    const expr = '2 < 1'

    const result = parse(expr)

    expect(result).toBe(false)
  })

  it('should parse greater than or equal operator', () => {
    const expr = '1 >= 1'
    const result = parse(expr)

    expect(result).toBe(true)
  })

  it('should parse less than or equal operator', () => {
    const expr = '1 <= 1'

    const result = parse(expr)

    expect(result).toBe(true)
  })
})
