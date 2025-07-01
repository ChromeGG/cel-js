import { expect, describe, it } from 'vitest'
import { CelEvaluationError, evaluate } from '..'

describe('collection macros', () => {
  const context = {
    groups: [
      { custom: true, name: "group 1" },
      { custom: false, name: "group 2" },
      { custom: true, name: "group 3" }
    ],
    numbers: [1, 2, 3, 4, 5],
    people: [
      { name: "Alice", age: 25 },
      { name: "Bob", age: 30 },
      { name: "Charlie", age: 35 }
    ],
    scores: { alice: 85, bob: 92, charlie: 78 }
  }

  describe('filter', () => {
    it('should filter list with boolean condition', () => {
      const expr = 'groups.filter(group, group.custom == true)'
      const result = evaluate(expr, context)
      
      expect(result).toStrictEqual([
        { custom: true, name: "group 1" },
        { custom: true, name: "group 3" }
      ])
    })

    it('should filter list', () => {
      const expr = 'numbers.filter(n, n > 3)'
      const result = evaluate(expr, context)
      
      expect(result).toStrictEqual([4, 5])
    })

    it('should filter maps', () => {
      const expr = 'scores.filter(name, scores[name] > 80)'
      const result = evaluate(expr, context)
      
      expect(result).toStrictEqual(['alice', 'bob'])
    })
  })

  describe('all', () => {
    it('should return true if all items match condition', () => {
      const expr = 'numbers.all(n, n > 0)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(true)
    })

    it('should return false if not all items match', () => {
      const expr = 'numbers.all(n, n > 3)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(false)
    })

    it('should operate on lists', () => {
      const expr = 'groups.all(group, group.custom == true)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(false) // Not all groups have custom=true
    })

    it('should operate on maps', () => {
      const expr = 'scores.all(name, scores[name] > 70)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(true) // All scores are > 70
    })
    
  })

  describe('exists', () => {
    it('should return true if any item matches condition', () => {
      const expr = 'numbers.exists(n, n > 4)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(true)
    })

    it('should return false if no items match', () => {
      const expr = 'numbers.exists(n, n > 10)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(false)
    })

    it('should operate on lists', () => {
      const expr = 'groups.exists(group, group.custom == true)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(true) // At least one group has custom=true
    })

    it('should operate on maps', () => {
      const expr = 'scores.exists(name, scores[name] > 80)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(true) // At least one score is > 80
    })
    
  })

  describe('exists_one', () => {
    it('should return true if exactly one item matches', () => {
      const expr = 'numbers.exists_one(n, n == 5)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(true)
    })

    it('should return false if multiple items match', () => {
      const expr = 'numbers.exists_one(n, n > 3)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(false)
    })

    it('should return false if no items match', () => {
      const expr = 'numbers.exists_one(n, n > 10)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(false)
    })

    it('should operate on lists', () => {
      const expr = 'groups.exists_one(group, group.custom == false)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(true) // Exactly one group has custom=false
    })

    it('should operate on maps', () => {
      const expr = 'scores.exists_one(name, scores[name] > 90)'
      const result = evaluate(expr, context)
      
      expect(result).toBe(true) // Exactly one score is > 90
    })
  })

  describe('map', () => {
    it('should transform list items (simple map)', () => {
      const expr = 'numbers.map(n, n * 2)'
      const result = evaluate(expr, context)
      
      expect(result).toStrictEqual([2, 4, 6, 8, 10])
    })

    it('should filter and transform (map with predicate)', () => {
      const expr = 'numbers.map(n, n > 3, n * 10)'
      const result = evaluate(expr, context)
      
      expect(result).toStrictEqual([40, 50])
    })

    it('should extract property names', () => {
      const expr = 'people.map(person, person.name)'
      const result = evaluate(expr, context)
      
      expect(result).toStrictEqual(['Alice', 'Bob', 'Charlie'])
    })

    it('should operate on lists', () => {
      const expr = 'groups.map(group, group.name)'
      const result = evaluate(expr, context)
      
      expect(result).toStrictEqual(['group 1', 'group 2', 'group 3'])
    })

    it('should operate on maps', () => {
      const expr = 'scores.map(name, scores[name] * 2)'
      const result = evaluate(expr, context)
      
      expect(result).toStrictEqual([170, 184, 156])
    })
  })

  describe('error handling', () => {
    it('should throw error if collection is not a list or map', () => {
      const contextWithString = { ...context, str: 'hello' }
      
      expect(() => evaluate('str.map(n, n * 2)', contextWithString)).toThrow(CelEvaluationError)
    })

    describe('variable name validation', () => {
      it('should reject complex expressions as variable names', () => {
        expect(() => evaluate('numbers.filter(x + y, true)', context)).toThrow('Variable name must be a simple identifier')
      })

      it('should reject ternary expressions as variable names', () => {
        expect(() => evaluate('numbers.filter(x ? y : z, true)', context)).toThrow('Variable name must be a simple identifier')
      })

      it('should reject comparison expressions as variable names', () => {
        expect(() => evaluate('numbers.filter(x > 5, true)', context)).toThrow('Variable name must be a simple identifier')
      })

      it('should reject dot notation as variable names', () => {
        expect(() => evaluate('numbers.filter(obj.prop, true)', context)).toThrow('Variable name must be a simple identifier')
      })

      it('should reject index expressions as variable names', () => {
        expect(() => evaluate('numbers.filter(arr[0], true)', context)).toThrow('Variable name must be a simple identifier')
      })

      it('should reject function calls as variable names', () => {
        expect(() => evaluate('numbers.filter(func(), true)', context)).toThrow('Variable name must be a simple identifier')
      })

      it('should reject literals as variable names', () => {
        expect(() => evaluate('numbers.filter(123, true)', context)).toThrow('Variable name must be a simple identifier')
        expect(() => evaluate('numbers.filter("string", true)', context)).toThrow('Variable name must be a simple identifier')
        expect(() => evaluate('numbers.filter(true, true)', context)).toThrow('Variable name must be a simple identifier')
      })

      it('should accept simple identifiers as variable names', () => {
        // This should work fine
        expect(() => evaluate('numbers.filter(item, item > 3)', context)).not.toThrow()
        expect(() => evaluate('groups.map(group, group.name)', context)).not.toThrow()
      })
    })
  })

  describe('nested macros', () => {
    it('should handle nested macros', () => {
      const contextWithMap = { ...context, data: [{'a': 10, 'b': 5, 'c': 20}] }
      const expr = "data.map(m, m.filter(key, m[key] > 10))"
      const result = evaluate(expr, contextWithMap)

      expect(result).toStrictEqual([['c']])
    })

    it('should handle deep nesting with multiple collections', () => {
      const deepContext = {
        sets: [
          { type: 'odd', numbers: [1, 3, 5] },
          { type: 'even', numbers: [2, 4, 6] }
          ]
        }
      const expr = "sets.map(set, set.numbers.filter(id, id > 3).map(id, id * 10))"
      const result = evaluate(expr, deepContext)

      expect(result).toStrictEqual([ [ 50 ], [ 40, 60 ] ])
    })
    
  })
}) 
