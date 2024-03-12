import { expect, describe, it } from 'vitest'
import { CelEvaluationError, CelTypeError, evaluate } from '..'
import { Operations } from '../helper'

describe('maps expressions', () => {
    describe('maps', () => {
        it('should create a empty map', () => {
        const expr = '{}'
    
        const result = evaluate(expr)
    
        expect(result).toStrictEqual({})
        })
    
        it('should create a one element map', () => {
        const expr = '{"a": 1}'
    
        const result = evaluate(expr)
    
        expect(result).toStrictEqual({ a: 1 })
        })
    
        it('should create a many element map', () => {
        const expr = '{"a": 1, "b": 2, "c": 3}'
    
        const result = evaluate(expr)
    
        expect(result).toStrictEqual({ "a": 1, "b": 2, "c": 3 })
        })
    
        it('should throw an error if maps have different types', () => {
        const expr = '{"a": 1, "b": true}'
    
        const result = () => evaluate(expr)
    
        expect(result).toThrow(new CelEvaluationError('invalid_argument: true'))
        })
    })
    
})