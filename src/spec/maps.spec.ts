import { expect, describe, it } from 'vitest'
import { CelEvaluationError, CelTypeError, evaluate } from '..'
import { Operations } from '../helper'

describe('maps expressions', () => {
    describe('creation', () => {
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

    describe('index', () => {

       describe('dot expression', () => {
        it('should get the value of a key', () => {
            const expr = '{"a": 1}.a'
        
            const result = evaluate(expr)
        
            expect(result).toStrictEqual(1)
        })
        
        it('should throw an error if the key does not exist', () => {
            const expr = '{"a": 1}.b'
        
            const result = () => evaluate(expr)
        
            expect(result).toThrow(new CelEvaluationError('Identifier "b" not found, no context passed'))
        })
        
        it.todo('should throw an error if the key is not a string', () => {
            const expr = '{"a": 1}.1'
        
            const result = () => evaluate(expr)
        
            expect(result).toThrow(new CelEvaluationError('invalid_argument: 1'))
        })
       })
       describe('index expression', () => {
        it('should get the value of a key', () => {
            const expr = '{"a": 1}["a"]'
        
            const result = evaluate(expr)
        
            expect(result).toStrictEqual(1)
        })
        
        it('should throw an error if the key does not exist', () => {
            const expr = '{"a": 1}["b"]'
        
            const result = () => evaluate(expr)
        
            expect(result).toThrow(new CelEvaluationError('Identifier "b" not found, no context passed'))
        })
        
        it('should throw an error if the key is not a string', () => {
            const expr = '{"a": 1}[1]'
        
            const result = () => evaluate(expr)
        
            expect(result).toThrow(new CelEvaluationError('Identifier "1" not found, no context passed'))
        })
       })
    })

    describe('addition', () => {
        it('should add to values accessed by index', () => {
            const expr = '{"a": 1, "b": 2}["a"] + {"a": 1, "b": 2}["b"]'
            
            const result = evaluate(expr)

            expect(result).toStrictEqual(3)

        })
    })
    
})