import { expect, describe, it } from 'vitest'

import { evaluate } from '..'
import { CelParseError } from '../errors/CelParseError'

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

  it('should evaluate a double-quoted string literal', () => {
    const expr = '"foo"'

    const result = evaluate(expr)

    expect(result).toBe('foo')
  })

  it('should evaluate a single-quoted string literal', () => {
    const expr = "'foo'"

    const result = evaluate(expr)

    expect(result).toBe('foo')
  })

  it('should not parse a double-quoted string with a newline', () => {
    const expr = `"fo
o"`

    const result = () => evaluate(expr)

    expect(result).toThrow(
      new CelParseError(
        'Given string is not a valid CEL expression: Redundant input, expecting EOF but found: o',
      ),
    )
  })

  it('should not parse a single-quoted string with a newline', () => {
    const expr = `'fo
o'`

    const result = () => evaluate(expr)

    expect(result).toThrow(
      new CelParseError(
        'Given string is not a valid CEL expression: Redundant input, expecting EOF but found: o',
      ),
    )
  })

  it('should evaluate a float', () => {
    const expr = '1.2'

    const result = evaluate(expr)

    expect(Number(result)).toBe(1.2)
    expect(result.valueOf()).toBe(1.2)
  })

  describe('raw strings', () => {
    it('should evaluate a raw string with double quotes', () => {
      const expr = 'r"hello world"'

      const result = evaluate(expr)

      expect(result).toBe('hello world')
    })

    it('should evaluate a raw string with single quotes', () => {
      const expr = "r'hello world'"

      const result = evaluate(expr)

      expect(result).toBe('hello world')
    })

    it('should preserve escape sequences in raw strings', () => {
      const expr = 'r"hello\\nworld\\t!"'

      const result = evaluate(expr)

      expect(result).toBe('hello\\nworld\\t!')
    })

    it('should preserve backslashes in raw strings', () => {
      const expr = 'r"C:\\\\Users\\\\test"'

      const result = evaluate(expr)

      expect(result).toBe('C:\\\\Users\\\\test')
    })

    it('should handle quotes inside raw strings', () => {
      const expr = "r'She said \"Hello\"'"

      const result = evaluate(expr)

      expect(result).toBe('She said "Hello"')
    })

    it('should handle newlines in raw strings', () => {
      const expr = `r"line1
line2"`

      const result = evaluate(expr)

      expect(result).toBe('line1\nline2')
    })

    it('should handle raw string with single quotes containing double quotes', () => {
      const expr = `r'He said "Hello"'`

      const result = evaluate(expr)

      expect(result).toBe('He said "Hello"')
    })

    it('should handle raw string with double quotes containing single quotes', () => {
      const expr = `r"It's a test"`

      const result = evaluate(expr)

      expect(result).toBe("It's a test")
    })
  })

  describe('triple-quote strings', () => {
    it('should evaluate a triple-quote string with double quotes', () => {
      const expr = '"""hello world"""'

      const result = evaluate(expr)

      expect(result).toBe('hello world')
    })

    it('should evaluate a triple-quote string with single quotes', () => {
      const expr = "'''hello world'''"

      const result = evaluate(expr)

      expect(result).toBe('hello world')
    })

    it('should handle multiline content in triple-quote strings', () => {
      const expr = `"""line1
line2
line3"""`

      const result = evaluate(expr)

      expect(result).toBe('line1\nline2\nline3')
    })

    it('should handle quotes inside triple-quote strings', () => {
      const expr = `"""She said "Hello" and 'Goodbye'"""`

      const result = evaluate(expr)

      expect(result).toBe(`She said "Hello" and 'Goodbye'`)
    })

    it('should handle escape sequences in triple-quote strings', () => {
      const expr = '"""hello\\nworld\\t!"""'

      const result = evaluate(expr)

      expect(result).toBe('hello\nworld\t!')
    })

    it('should handle mixed quotes in triple-quote strings', () => {
      const expr = `'''He said "It's working!"'''`

      const result = evaluate(expr)

      expect(result).toBe(`He said "It's working!"`)
    })

    it('should handle empty triple-quote strings', () => {
      const expr = '""""""'

      const result = evaluate(expr)

      expect(result).toBe('')
    })

    it('should handle triple-quote strings with indentation', () => {
      const expr = `"""
  indented line 1
  indented line 2
"""`

      const result = evaluate(expr)

      expect(result).toBe('\n  indented line 1\n  indented line 2\n')
    })

    it('should handle backslashes in triple-quote strings', () => {
      const expr = '"""C:\\\\Users\\\\Documents"""'

      const result = evaluate(expr)

      expect(result).toBe('C:\\Users\\Documents')
    })
  })

  describe('byte strings', () => {
    it('should evaluate a byte string with double quotes', () => {
      const expr = 'b"hello"'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([104, 101, 108, 108, 111])) // "hello" as bytes
    })

    it('should evaluate a byte string with single quotes', () => {
      const expr = "b'world'"

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([119, 111, 114, 108, 100])) // "world" as bytes
    })

    it('should handle hex escape sequences in byte strings', () => {
      const expr = 'b"\\x41\\x42\\x43"'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([65, 66, 67])) // ABC in hex
    })

    it('should handle octal escape sequences in byte strings', () => {
      const expr = 'b"\\101\\102\\103"'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([65, 66, 67])) // ABC in octal
    })

    it('should handle mixed ASCII and escape sequences', () => {
      const expr = 'b"A\\x42C"'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([65, 66, 67])) // ABC
    })

    it('should handle common escape sequences in byte strings', () => {
      const expr = 'b"\\n\\t\\r\\\\"'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([10, 9, 13, 92])) // \n, \t, \r, \\
    })

    it('should handle quotes inside byte strings', () => {
      const expr = 'b"Say \\"hello\\""'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([83, 97, 121, 32, 34, 104, 101, 108, 108, 111, 34])) // 'Say "hello"'
    })

    it('should handle empty byte strings', () => {
      const expr = 'b""'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([]))
    })

    it('should handle byte strings with null bytes', () => {
      const expr = 'b"\\x00\\x01\\x02"'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([0, 1, 2]))
    })

    it('should handle byte strings with high byte values', () => {
      const expr = 'b"\\xff\\xfe\\xfd"'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([255, 254, 253]))
    })
  })

  describe('bytes literals', () => {
    it('should evaluate a bytes literal with hex values', () => {
      const expr = 'bytes([0x41, 0x42, 0x43])'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([65, 66, 67])) // ABC
    })

    it('should evaluate a bytes literal with decimal values', () => {
      const expr = 'bytes([72, 101, 108, 108, 111])'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111])) // "Hello"
    })

    it('should evaluate an empty bytes literal', () => {
      const expr = 'bytes([])'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([]))
    })

    it('should handle bytes literal with single value', () => {
      const expr = 'bytes([65])'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([65])) // "A"
    })

    it('should handle bytes literal with null bytes', () => {
      const expr = 'bytes([0, 1, 2])'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([0, 1, 2]))
    })

    it('should handle bytes literal with max byte values', () => {
      const expr = 'bytes([255, 254, 253])'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([255, 254, 253]))
    })

    it('should handle bytes literal with mixed decimal and hex values', () => {
      const expr = 'bytes([65, 0x42, 67])'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([65, 66, 67])) // ABC
    })

    it('should handle bytes literal from string conversion', () => {
      const expr = 'bytes("ABC")'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([65, 66, 67])) // ABC
    })

    it('should handle bytes literal from empty string', () => {
      const expr = 'bytes("")'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([]))
    })

    it('should handle bytes literal with unicode string', () => {
      const expr = 'bytes("café")'

      const result = evaluate(expr)

      expect(result).toEqual(new Uint8Array([99, 97, 102, 195, 169])) // UTF-8 encoding of "café"
    })
  })
})
