import { describe, it, expect } from 'vitest'
import { parseBasicTextproto, conformanceValueToJS } from './simple-parser'

describe('Simple TextProto Parser - Focused Tests', () => {
  describe('Basic Parsing', () => {
    it('should parse top-level name and description', () => {
      const input = `name: "test_file"
description: "A test file"`
      const result = parseBasicTextproto(input)
      
      expect(result.name).toBe('test_file')
      expect(result.description).toBe('A test file')
      expect(result.section).toEqual([])
    })

    it('should parse sections with name and description', () => {
      const input = `name: "basic"
section {
  name: "test_section"
  description: "Section description"
}`
      const result = parseBasicTextproto(input)
      
      expect(result.section).toHaveLength(1)
      expect(result.section[0].name).toBe('test_section')
      expect(result.section[0].description).toBe('Section description')
      expect(result.section[0].test).toEqual([])
    })

    it('should parse tests with name and expr', () => {
      const input = `name: "basic"
section {
  name: "test_section"
  test {
    name: "test_one"
    expr: "1 + 1"
  }
}`
      const result = parseBasicTextproto(input)
      
      expect(result.section[0].test).toHaveLength(1)
      expect(result.section[0].test[0].name).toBe('test_one')
      expect(result.section[0].test[0].expr).toBe('1 + 1')
    })

    it('should handle comments correctly', () => {
      const input = `# This is a comment
name: "test"
# Another comment
description: "desc"
section {
  # Comment in section
  name: "sect"
}`
      const result = parseBasicTextproto(input)
      
      expect(result.name).toBe('test')
      expect(result.description).toBe('desc')
      expect(result.section[0].name).toBe('sect')
    })

    it('should parse multiple sections', () => {
      const input = `name: "multi_test"
section {
  name: "section1"
  test {
    name: "test1"
    expr: "1"
  }
}
section {
  name: "section2"
  test {
    name: "test2"
    expr: "2"
  }
}`
      const result = parseBasicTextproto(input)
      
      expect(result.section).toHaveLength(2)
      expect(result.section[0].name).toBe('section1')
      expect(result.section[1].name).toBe('section2')
      expect(result.section[0].test[0].name).toBe('test1')
      expect(result.section[1].test[0].name).toBe('test2')
    })

    it('should parse multiple tests in a section', () => {
      const input = `section {
  name: "multi_tests"
  test {
    name: "test1"
    expr: "true"
  }
  test {
    name: "test2"
    expr: "false"
  }
  test {
    name: "test3"
    expr: "42"
  }
}`
      const result = parseBasicTextproto(input)
      
      expect(result.section[0].test).toHaveLength(3)
      expect(result.section[0].test[0].name).toBe('test1')
      expect(result.section[0].test[1].name).toBe('test2')
      expect(result.section[0].test[2].name).toBe('test3')
      expect(result.section[0].test[0].expr).toBe('true')
      expect(result.section[0].test[1].expr).toBe('false')
      expect(result.section[0].test[2].expr).toBe('42')
    })
  })

  describe('Expression Parsing', () => {
    it('should parse basic expressions', () => {
      const input = `section {
  test {
    name: "basic_expr"
    expr: "1 + 1"
  }
}`
      const result = parseBasicTextproto(input)
      
      expect(result.section[0].test[0].expr).toBe('1 + 1')
    })

    it('should handle complex expressions', () => {
      const input = `section {
  test {
    name: "complex_expr"
    expr: "has({'key': 'value'}) && size([1, 2, 3]) > 0"
  }
}`
      const result = parseBasicTextproto(input)
      
      expect(result.section[0].test[0].expr).toBe("has({'key': 'value'}) && size([1, 2, 3]) > 0")
    })

    it('should preserve special characters in expressions', () => {
      const input = `section {
  test {
    name: "special_chars"
    expr: "string.contains('hello@world.com', '@')"
  }
}`
      const result = parseBasicTextproto(input)
      
      expect(result.section[0].test[0].expr).toBe("string.contains('hello@world.com', '@')")
    })
  })

  describe('conformanceValueToJS function', () => {
    it('should convert int64_value to number', () => {
      const value = { int64_value: 42 }
      expect(conformanceValueToJS(value)).toBe(42)
    })

    it('should convert uint64_value to number', () => {
      const value = { uint64_value: 123 }
      expect(conformanceValueToJS(value)).toBe(123)
    })

    it('should convert double_value to number', () => {
      const value = { double_value: 3.14 }
      expect(conformanceValueToJS(value)).toBe(3.14)
    })

    it('should convert string_value to string', () => {
      const value = { string_value: 'hello' }
      expect(conformanceValueToJS(value)).toBe('hello')
    })

    it('should convert bool_value to boolean', () => {
      expect(conformanceValueToJS({ bool_value: true })).toBe(true)
      expect(conformanceValueToJS({ bool_value: false })).toBe(false)
    })

    it('should convert null_value to null', () => {
      const value = { null_value: null }
      expect(conformanceValueToJS(value)).toBe(null)
    })

    it('should convert bytes_value to Uint8Array', () => {
      const value = { bytes_value: 'hello' }
      const result = conformanceValueToJS(value)
      expect(result).toBeInstanceOf(Uint8Array)
      expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]) // 'hello' as bytes
    })

    it('should convert list_value to array', () => {
      const value = {
        list_value: {
          values: [
            { int64_value: 1 },
            { string_value: 'test' },
            { bool_value: true }
          ]
        }
      }
      expect(conformanceValueToJS(value)).toEqual([1, 'test', true])
    })

    it('should convert map_value to object', () => {
      const value = {
        map_value: {
          entries: [
            {
              key: { string_value: 'name' },
              value: { string_value: 'John' }
            },
            {
              key: { string_value: 'age' },
              value: { int64_value: 30 }
            }
          ]
        }
      }
      expect(conformanceValueToJS(value)).toEqual({ name: 'John', age: 30 })
    })

    it('should handle empty values', () => {
      expect(conformanceValueToJS({})).toBeUndefined()
    })

    it('should handle nested structures', () => {
      const value = {
        map_value: {
          entries: [
            {
              key: { string_value: 'data' },
              value: {
                list_value: {
                  values: [
                    { int64_value: 1 },
                    { int64_value: 2 },
                    { int64_value: 3 }
                  ]
                }
              }
            }
          ]
        }
      }
      expect(conformanceValueToJS(value)).toEqual({ data: [1, 2, 3] })
    })
  })

  describe('Edge Cases and Robustness', () => {
    it('should handle empty input', () => {
      const result = parseBasicTextproto('')
      expect(result.name).toBe('')
      expect(result.description).toBe('')
      expect(result.section).toEqual([])
    })

    it('should handle whitespace-only input', () => {
      const result = parseBasicTextproto('   \n\n  \t  \n   ')
      expect(result.name).toBe('')
      expect(result.description).toBe('')
      expect(result.section).toEqual([])
    })

    it('should handle comments-only input', () => {
      const input = `# Just comments here
# Another comment
# Final comment`
      const result = parseBasicTextproto(input)
      expect(result.name).toBe('')
      expect(result.description).toBe('')
      expect(result.section).toEqual([])
    })

    it('should handle disable_check flag', () => {
      const input = `section {
  test {
    name: "test_disabled"
    expr: "x + y"
    disable_check: true
  }
}`
      const result = parseBasicTextproto(input)
      expect(result.section[0].test[0].disable_check).toBe(true)
    })

    it('should handle expressions with special characters', () => {
      const input = `section {
  test {
    name: "special_chars"
    expr: "Special chars: {}[](),:;!@#$%^&*"
  }
}`
      const result = parseBasicTextproto(input)
      expect(result.section[0].test[0].expr).toBe('Special chars: {}[](),:;!@#$%^&*')
    })

    it('should handle very long expressions', () => {
      const longExpr = 'a'.repeat(1000)
      const input = `section {
  test {
    name: "long_test"
    expr: "${longExpr}"
  }
}`
      const result = parseBasicTextproto(input)
      expect(result.section[0].test[0].expr).toBe(longExpr)
    })

    it('should parse real conformance test structure', () => {
      const input = `name: "basic"
description: "Basic conformance tests that all implementations should pass."
section {
  name: "self_eval_zeroish"
  description: "Simple self-evaluating forms to zero-ish values."
  test {
    name: "self_eval_int_zero"
    expr: "0"
  }
  test {
    name: "self_eval_uint_zero"
    expr: "0u"
  }
  test {
    name: "self_eval_string_empty"
    expr: "''"
  }
}`
      
      const result = parseBasicTextproto(input)
      
      expect(result.name).toBe('basic')
      expect(result.description).toBe('Basic conformance tests that all implementations should pass.')
      expect(result.section).toHaveLength(1)
      expect(result.section[0].name).toBe('self_eval_zeroish')
      expect(result.section[0].description).toBe('Simple self-evaluating forms to zero-ish values.')
      expect(result.section[0].test).toHaveLength(3)
      
      expect(result.section[0].test[0].name).toBe('self_eval_int_zero')
      expect(result.section[0].test[0].expr).toBe('0')
      
      expect(result.section[0].test[1].name).toBe('self_eval_uint_zero')
      expect(result.section[0].test[1].expr).toBe('0u')
      
      expect(result.section[0].test[2].name).toBe('self_eval_string_empty')
      expect(result.section[0].test[2].expr).toBe("''")
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', () => {
      const input = 'not valid textproto at all'
      const result = parseBasicTextproto(input)
      
      // Should not throw, should return empty structure
      expect(result.name).toBe('')
      expect(result.description).toBe('')
      expect(result.section).toEqual([])
    })

    it('should handle incomplete sections gracefully', () => {
      const input = `name: "test"
section {
  name: "incomplete"
  # Missing closing brace, but parser should handle this gracefully
}`
      const result = parseBasicTextproto(input)
      
      // Should parse what it can
      expect(result.name).toBe('test')
      // The parser might or might not find the incomplete section
      // We just check it doesn't crash
      expect(Array.isArray(result.section)).toBe(true)
    })
  })
})
