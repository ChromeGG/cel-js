import { expect, describe, it } from 'vitest'

import { evaluate } from '..'

describe('Math Functions', () => {
  describe('abs', () => {
    it('should return absolute value of positive integer', () => {
      const result = evaluate('abs(5)')
      expect(result).toBe(5)
    })

    it('should return absolute value of negative integer', () => {
      const result = evaluate('abs(-5)')
      expect(result).toBe(5)
    })

    it('should return absolute value of zero', () => {
      const result = evaluate('abs(0)')
      expect(result).toBe(0)
    })

    it('should return absolute value of positive float', () => {
      const result = evaluate('abs(3.14)')
      expect(result).toBe(3.14)
    })

    it('should return absolute value of negative float', () => {
      const result = evaluate('abs(-3.14)')
      expect(result).toBe(3.14)
    })

    it('should work with expressions', () => {
      const result = evaluate('abs(-5 + 2)')
      expect(result).toBe(3)
    })
  })

  describe('max', () => {
    it('should return maximum of two positive integers', () => {
      const result = evaluate('max(5, 3)')
      expect(result).toBe(5)
    })

    it('should return maximum of two negative integers', () => {
      const result = evaluate('max(-5, -3)')
      expect(result).toBe(-3)
    })

    it('should return maximum of positive and negative integers', () => {
      const result = evaluate('max(-5, 3)')
      expect(result).toBe(3)
    })

    it('should return maximum of two equal integers', () => {
      const result = evaluate('max(5, 5)')
      expect(result).toBe(5)
    })

    it('should return maximum of two floats', () => {
      const result = evaluate('max(3.14, 2.71)')
      expect(result).toBe(3.14)
    })

    it('should return maximum of integer and float', () => {
      const result = evaluate('max(5, 3.14)')
      expect(result).toBe(5)
    })

    it('should work with expressions', () => {
      const result = evaluate('max(2 + 3, 4)')
      expect(result).toBe(5)
    })
  })

  describe('min', () => {
    it('should return minimum of two positive integers', () => {
      const result = evaluate('min(5, 3)')
      expect(result).toBe(3)
    })

    it('should return minimum of two negative integers', () => {
      const result = evaluate('min(-5, -3)')
      expect(result).toBe(-5)
    })

    it('should return minimum of positive and negative integers', () => {
      const result = evaluate('min(-5, 3)')
      expect(result).toBe(-5)
    })

    it('should return minimum of two equal integers', () => {
      const result = evaluate('min(5, 5)')
      expect(result).toBe(5)
    })

    it('should return minimum of two floats', () => {
      const result = evaluate('min(3.14, 2.71)')
      expect(result).toBe(2.71)
    })

    it('should return minimum of integer and float', () => {
      const result = evaluate('min(5, 3.14)')
      expect(result).toBe(3.14)
    })

    it('should work with expressions', () => {
      const result = evaluate('min(2 + 3, 4)')
      expect(result).toBe(4)
    })
  })

  describe('floor', () => {
    it('should return floor of positive float', () => {
      const result = evaluate('floor(3.14)')
      expect(result).toBe(3)
    })

    it('should return floor of negative float', () => {
      const result = evaluate('floor(-3.14)')
      expect(result).toBe(-4)
    })

    it('should return floor of positive integer', () => {
      const result = evaluate('floor(5)')
      expect(result).toBe(5)
    })

    it('should return floor of negative integer', () => {
      const result = evaluate('floor(-5)')
      expect(result).toBe(-5)
    })

    it('should return floor of zero', () => {
      const result = evaluate('floor(0)')
      expect(result).toBe(0)
    })

    it('should work with expressions', () => {
      const result = evaluate('floor(5.7 - 1.2)')
      expect(result).toBe(4)
    })
  })

  describe('ceil', () => {
    it('should return ceiling of positive float', () => {
      const result = evaluate('ceil(3.14)')
      expect(result).toBe(4)
    })

    it('should return ceiling of negative float', () => {
      const result = evaluate('ceil(-3.14)')
      expect(result).toBe(-3)
    })

    it('should return ceiling of positive integer', () => {
      const result = evaluate('ceil(5)')
      expect(result).toBe(5)
    })

    it('should return ceiling of negative integer', () => {
      const result = evaluate('ceil(-5)')
      expect(result).toBe(-5)
    })

    it('should return ceiling of zero', () => {
      const result = evaluate('ceil(0)')
      expect(result).toBe(0)
    })

    it('should work with expressions', () => {
      const result = evaluate('ceil(5.7 - 1.8)')
      expect(result).toBe(4)
    })
  })
})
