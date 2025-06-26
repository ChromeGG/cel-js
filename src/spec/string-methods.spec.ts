import { describe, it, expect } from 'vitest'
import { evaluate } from '../index'

describe('String Methods', () => {
  describe('contains() method', () => {
    it('should return true when string contains substring', () => {
      expect(evaluate('"hello world".contains("world")')).toBe(true)
      expect(evaluate('"hello world".contains("hello")')).toBe(true)
      expect(evaluate('"hello world".contains("o w")')).toBe(true)
    })

    it('should return false when string does not contain substring', () => {
      expect(evaluate('"hello world".contains("foo")')).toBe(false)
      expect(evaluate('"hello world".contains("WORLD")')).toBe(false)
      expect(evaluate('"hello".contains("hello world")')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(evaluate('"hello".contains("")')).toBe(true)
      expect(evaluate('"".contains("")')).toBe(true)
      expect(evaluate('"".contains("hello")')).toBe(false)
    })

    it('should handle special characters', () => {
      expect(evaluate('"hello@world.com".contains("@")')).toBe(true)
      expect(evaluate('"path/to/file".contains("/")')).toBe(true)
      expect(evaluate('"line1\\nline2".contains("\\n")')).toBe(true)
    })

    it('should handle unicode characters', () => {
      expect(evaluate('"café".contains("é")')).toBe(true)
      expect(evaluate('"🚀 rocket".contains("🚀")')).toBe(true)
    })

    it('should be case sensitive', () => {
      expect(evaluate('"Hello World".contains("hello")')).toBe(false)
      expect(evaluate('"Hello World".contains("Hello")')).toBe(true)
    })

    it('should throw error with wrong number of arguments', () => {
      expect(() => evaluate('"hello".contains()')).toThrow()
      expect(() => evaluate('"hello".contains("a", "b")')).toThrow()
    })

    it('should throw error with non-string argument', () => {
      expect(() => evaluate('"hello".contains(123)')).toThrow()
      expect(() => evaluate('"hello".contains(true)')).toThrow()
    })
  })

  describe('endsWith() method', () => {
    it('should return true when string ends with suffix', () => {
      expect(evaluate('"hello world".endsWith("world")')).toBe(true)
      expect(evaluate('"hello world".endsWith("d")')).toBe(true)
      expect(evaluate('"filename.txt".endsWith(".txt")')).toBe(true)
    })

    it('should return false when string does not end with suffix', () => {
      expect(evaluate('"hello world".endsWith("hello")')).toBe(false)
      expect(evaluate('"hello world".endsWith("WORLD")')).toBe(false)
      expect(evaluate('"filename.txt".endsWith(".pdf")')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(evaluate('"hello".endsWith("")')).toBe(true)
      expect(evaluate('"".endsWith("")')).toBe(true)
      expect(evaluate('"".endsWith("hello")')).toBe(false)
    })

    it('should handle strings equal to suffix', () => {
      expect(evaluate('"hello".endsWith("hello")')).toBe(true)
      expect(evaluate('"a".endsWith("a")')).toBe(true)
    })

    it('should handle special characters', () => {
      expect(evaluate('"file.backup~".endsWith("~")')).toBe(true)
      expect(evaluate('"query?param=value".endsWith("value")')).toBe(true)
    })

    it('should handle unicode characters', () => {
      expect(evaluate('"café".endsWith("é")')).toBe(true)
      expect(evaluate('"message 🎉".endsWith("🎉")')).toBe(true)
    })

    it('should be case sensitive', () => {
      expect(evaluate('"Hello World".endsWith("world")')).toBe(false)
      expect(evaluate('"Hello World".endsWith("World")')).toBe(true)
    })

    it('should throw error with wrong number of arguments', () => {
      expect(() => evaluate('"hello".endsWith()')).toThrow()
      expect(() => evaluate('"hello".endsWith("a", "b")')).toThrow()
    })

    it('should throw error with non-string argument', () => {
      expect(() => evaluate('"hello".endsWith(123)')).toThrow()
      expect(() => evaluate('"hello".endsWith(false)')).toThrow()
    })
  })

  describe('trim() method', () => {
    it('should remove leading and trailing whitespace', () => {
      expect(evaluate('"  hello world  ".trim()')).toBe('hello world')
      expect(evaluate('"\\thello\\t".trim()')).toBe('\\thello\\t')
      expect(evaluate('"\\nhello\\n".trim()')).toBe('\\nhello\\n')
    })

    it('should handle strings with no whitespace', () => {
      expect(evaluate('"hello".trim()')).toBe('hello')
      expect(evaluate('"hello world".trim()')).toBe('hello world')
    })

    it('should handle empty strings', () => {
      expect(evaluate('"".trim()')).toBe('')
      expect(evaluate('"   ".trim()')).toBe('')
      expect(evaluate('"\\t\\n\\r ".trim()')).toBe('\\t\\n\\r')
    })

    it('should handle mixed whitespace characters', () => {
      expect(evaluate('"  \\t\\n hello world \\r\\n\\t  ".trim()')).toBe('\\t\\n hello world \\r\\n\\t')
    })

    it('should preserve internal whitespace', () => {
      expect(evaluate('"  hello   world  ".trim()')).toBe('hello   world')
      expect(evaluate('"\\thello\\t\\tworld\\t".trim()')).toBe('\\thello\\t\\tworld\\t')
    })

    it('should handle only leading whitespace', () => {
      expect(evaluate('"  hello world".trim()')).toBe('hello world')
    })

    it('should handle only trailing whitespace', () => {
      expect(evaluate('"hello world  ".trim()')).toBe('hello world')
    })

    it('should throw error with arguments', () => {
      expect(() => evaluate('"hello".trim("arg")')).toThrow()
      expect(() => evaluate('"hello".trim(123)')).toThrow()
    })
  })

  describe('split() method', () => {
    it('should split string by separator', () => {
      expect(evaluate('"a,b,c".split(",")')).toEqual(['a', 'b', 'c'])
      expect(evaluate('"hello world".split(" ")')).toEqual(['hello', 'world'])
      expect(evaluate('"one|two|three".split("|")')).toEqual(['one', 'two', 'three'])
    })

    it('should handle empty separator', () => {
      expect(evaluate('"abc".split("")')).toEqual(['a', 'b', 'c'])
      expect(evaluate('"hi".split("")')).toEqual(['h', 'i'])
    })

    it('should handle separator not found', () => {
      expect(evaluate('"hello world".split("x")')).toEqual(['hello world'])
      expect(evaluate('"abc".split("z")')).toEqual(['abc'])
    })

    it('should handle empty string', () => {
      expect(evaluate('"".split(",")')).toEqual([''])
      expect(evaluate('"".split("")')).toEqual([])
    })

    it('should handle consecutive separators', () => {
      expect(evaluate('"a,,b".split(",")')).toEqual(['a', '', 'b'])
      expect(evaluate('"a::b::c".split("::")')).toEqual(['a', 'b', 'c'])
    })

    it('should handle leading and trailing separators', () => {
      expect(evaluate('",a,b,".split(",")')).toEqual(['', 'a', 'b', ''])
      expect(evaluate('"::a::b::".split("::")')).toEqual(['', 'a', 'b', ''])
    })

    it('should handle multi-character separators', () => {
      expect(evaluate('"a::b::c".split("::")')).toEqual(['a', 'b', 'c'])
      expect(evaluate('"hello-->world-->test".split("-->")')).toEqual(['hello', 'world', 'test'])
    })

    it('should handle special characters as separators', () => {
      expect(evaluate('"a.b.c".split(".")')).toEqual(['a', 'b', 'c'])
      expect(evaluate('"path/to/file".split("/")')).toEqual(['path', 'to', 'file'])
      expect(evaluate('"line1\\nline2\\nline3".split("\\n")')).toEqual(['line1', 'line2', 'line3'])
    })

    it('should handle unicode characters', () => {
      expect(evaluate('"café🚀world".split("🚀")')).toEqual(['café', 'world'])
      expect(evaluate('"a•b•c".split("•")')).toEqual(['a', 'b', 'c'])
    })

    it('should throw error with wrong number of arguments', () => {
      expect(() => evaluate('"hello".split()')).toThrow()
      expect(() => evaluate('"hello".split(",", "extra")')).toThrow()
    })

    it('should throw error with non-string argument', () => {
      expect(() => evaluate('"hello".split(123)')).toThrow()
      expect(() => evaluate('"hello".split(true)')).toThrow()
    })
  })

  describe('String method chaining', () => {
    it('should support chaining with contains', () => {
      expect(evaluate('"  hello world  ".trim().contains("hello")')).toBe(true)
      expect(evaluate('"hello,world".split(",").size()')).toBe(2)
    })

    it('should support chaining with endsWith', () => {
      expect(evaluate('"  filename.txt  ".trim().endsWith(".txt")')).toBe(true)
    })

    it('should support complex chaining', () => {
      expect(evaluate('"  a,b,c  ".trim().split(",").size()')).toBe(3)
    })
  })

  describe('Integration with other features', () => {
    it('should work with variables', () => {
      expect(evaluate('str.contains("world")', { str: 'hello world' })).toBe(true)
      expect(evaluate('str.endsWith("txt")', { str: 'file.txt' })).toBe(true)
      expect(evaluate('str.trim()', { str: '  hello  ' })).toBe('hello')
      expect(evaluate('str.split(",")', { str: 'a,b,c' })).toEqual(['a', 'b', 'c'])
    })

    it('should work with function results', () => {
      expect(evaluate('string(123).contains("2")')).toBe(true)
      expect(evaluate('string(123).endsWith("3")')).toBe(true)
    })

    it('should work in complex expressions', () => {
      expect(evaluate('"hello world".contains("world") && "file.txt".endsWith(".txt")')).toBe(true)
      expect(evaluate('"  test  ".trim().size() == 4')).toBe(true)
      expect(evaluate('"a,b,c".split(",").all(x, x.size() == 1)')).toBe(true)
    })

    it('should work with conditional expressions', () => {
      expect(evaluate('str.contains("test") ? str.split(",") : []', { str: 'test,data' })).toEqual(['test', 'data'])
      expect(evaluate('str.endsWith(".log") ? str.trim() : str', { str: '  error.log' })).toBe('error.log')
    })
  })
})
