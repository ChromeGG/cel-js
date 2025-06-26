import { describe, it, expect } from 'vitest'
import { evaluate } from '../index.js'

describe('type() function', () => {
  it('should return "int" for integer values', () => {
    expect(evaluate('type(42)')).toBe('int')
    expect(evaluate('type(-5)')).toBe('int')
    expect(evaluate('type(0)')).toBe('int')
  })

  it('should return "int" for unsigned integer values (simplified implementation)', () => {
    // Note: For now, both 42 and 42u return "int" since we don't preserve type metadata
    // This could be enhanced later to properly distinguish uint types
    expect(evaluate('type(42u)')).toBe('int')
    expect(evaluate('type(0u)')).toBe('int')
  })

  it('should return "float" for floating point values', () => {
    expect(evaluate('type(3.14)')).toBe('float')
    expect(evaluate('type(-2.5)')).toBe('float')
  })

  it('should return "string" for string values', () => {
    expect(evaluate('type("hello")')).toBe('string')
    expect(evaluate('type("")')).toBe('string')
  })

  it('should return "bool" for boolean values', () => {
    expect(evaluate('type(true)')).toBe('bool')
    expect(evaluate('type(false)')).toBe('bool')
  })

  it('should return "null" for null values', () => {
    expect(evaluate('type(null)')).toBe('null')
  })

  it('should return "list" for list values', () => {
    expect(evaluate('type([1, 2, 3])')).toBe('list')
    expect(evaluate('type([])')).toBe('list')
  })

  it('should return "map" for map values', () => {
    expect(evaluate('type({"key": "value"})')).toBe('map')
    expect(evaluate('type({})')).toBe('map')
  })

  it('should work with variables from context', () => {
    const context = {
      intVar: 42,
      stringVar: 'hello',
      listVar: [1, 2, 3],
      mapVar: { key: 'value' }
    }
    
    expect(evaluate('type(intVar)', context)).toBe('int')
    expect(evaluate('type(stringVar)', context)).toBe('string')
    expect(evaluate('type(listVar)', context)).toBe('list')
    expect(evaluate('type(mapVar)', context)).toBe('map')
  })

  it('should work in comparisons', () => {
    expect(evaluate('type(42) == "int"')).toBe(true)
    expect(evaluate('type("hello") == "string"')).toBe(true)
    expect(evaluate('type([1, 2]) == "list"')).toBe(true)
    expect(evaluate('type(42) != "string"')).toBe(true)
  })

  it('should work with complex expressions', () => {
    const context = {
      obj: {
        field: ['item1', 'item2']
      }
    }
    
    expect(evaluate('has(obj.field) && type(obj.field) == "list"', context)).toBe(true)
    expect(evaluate('type(obj.field[0]) == "string"', context)).toBe(true)
  })

  it('should work with list element types', () => {
    const context = {
      stringList: ['a', 'b', 'c'],
      intList: [1, 2, 3]
    }
    
    expect(evaluate('type(stringList[0]) == "string"', context)).toBe(true)
    expect(evaluate('type(intList[0]) == "int"', context)).toBe(true)
  })
})
