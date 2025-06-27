import { describe, it, expect } from 'vitest'
import { parseBasicTextproto } from './simple-parser'

describe('TextprotoParser', () => {
  it('should parse simple textproto', () => {
    const content = `
name: "basic"
description: "Basic tests"
section {
  name: "test_section"
  test {
    name: "simple_test"
    expr: "1 + 1"
    value: { int64_value: 2 }
  }
}
    `
    
    const result = parseBasicTextproto(content)
    
    expect(result.name).toBe('basic')
    expect(result.description).toBe('Basic tests')
    expect(result.section).toHaveLength(1)
    expect(result.section[0].name).toBe('test_section')
    expect(result.section[0].test).toHaveLength(1)
    expect(result.section[0].test[0].name).toBe('simple_test')
    expect(result.section[0].test[0].expr).toBe('1 + 1')
  })

  it('should handle object values in test', () => {
    const content = `
name: "test"
section {
  name: "values"
  test {
    name: "int_test"
    expr: "42"
    value: { int64_value: 42 }
  }
}
    `
    
    const result = parseBasicTextproto(content)
    const test = result.section[0].test[0]
    
    expect(test.value.int64_value).toBe(42)
  })
})
