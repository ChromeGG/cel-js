import { expect, describe, it } from 'vitest'
import { CelTypeError, evaluate } from '..'
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
    
        // Shall we throw an error if maps have different types?
        // The original implementation does that if we put literals
        // but no in case of context usage. So for now we will not throw an error
        it.todo('should throw an error if maps have different types', () => {
        const expr = '{"a": 1, "b": true}'
    
        const result = () => evaluate(expr)
    
        expect(result).toThrow(new CelTypeError(Operations.logicalAnd, true, 1))
        })
    })
    
})