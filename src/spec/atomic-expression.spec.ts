import { expect, describe, it } from 'vitest'

import { parse } from '..'

describe('atomic expressions', () => {
  it('should parse a number', () => {
    const expr = '1'

    const result = parse(expr)

    expect(result).toBe(1)
  })
})
