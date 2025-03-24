import { describe, expect, it } from 'vitest'
import { evaluate } from '../index.js'

describe('Comments', () => {
  it('should ignore single-line comments', () => {
    expect(evaluate('1 + 2 // This is a comment')).toBe(3)
  })

  it('should ignore comments at the beginning of the line', () => {
    expect(evaluate('// This is a comment\n1 + 2')).toBe(3)
  })

  it('should allow comments between and after operators', () => {
    expect(
      evaluate('1 +// First comment\n// Second comment\n2 // Last comment'),
    ).toBe(3)
  })

  it('multi-line comments', () => {
    expect(
      evaluate(`
        "foo" + // some comment
        "bar"
      `),
    ).toBe('foobar')
  })

  it('should not parse // inside a string literal as a comment', () => {
    const result = evaluate('"This contains // but is not a comment"')
    expect(result).toBe('This contains // but is not a comment')
  })

  it('should support complex expressions with comments', () => {
    expect(
      evaluate(`true ? "yes" // some comment\n : \n// other comment\n "no"`),
    ).toBe('yes')
    expect(
      evaluate(`false ? "yes" // some comment\n : \n// other comment\n "no"`),
    ).toBe('no')
  })

  it('should support comments with special characters', () => {
    const result = evaluate(
      '1 + 2 // Special chars: !@#$%^&*()_+-=[]{}|;:\'",.<>/?`~😃',
    )
    expect(result).toBe(3)
  })
})
