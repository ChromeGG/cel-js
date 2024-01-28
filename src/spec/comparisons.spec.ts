import { expect, describe, it } from 'vitest'

import { evaluate } from '..'

describe('comparisons', () => {
  it('should evaluate greater than operator', () => {
    const expr = '2 > 1'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate less than operator', () => {
    const expr = '2 < 1'

    const result = evaluate(expr)

    expect(result).toBe(false)
  })

  it('should evaluate greater than or equal operator', () => {
    const expr = '1 >= 1'
    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate less than or equal operator', () => {
    const expr = '1 <= 1'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate equal operator', () => {
    const expr = '1 == 1'

    const result = evaluate(expr)

    expect(result).toBe(true)
  })

  it('should evaluate not equal operator', () => {
    const expr = '1 != 1'

    const result = evaluate(expr)

    expect(result).toBe(false)
  })
})
