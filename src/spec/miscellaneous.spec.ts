import { expect, describe, it } from 'vitest'

import { parse } from '..'

describe('miscellaneous', () => {
  it('order of arithmetic operations', () => {
    const expr = '1 + 2 * 3 + 1'

    const result = parse(expr)

    expect(result).toBe(8)
  })
})
