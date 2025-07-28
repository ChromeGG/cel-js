import { CELLexer } from './tokens.js'
import { CelParser } from './parser.js'
import { CelVisitor } from './visitor.js'
import type { Duration } from './helper.js'
import { CstNode } from 'chevrotain'
import { CelParseError } from './errors/CelParseError.js'

export { CelParseError } from './errors/CelParseError.js'
export { CelEvaluationError } from './errors/CelEvaluationError.js'
export { CelTypeError } from './errors/CelTypeError.js'
export type { Duration } from './helper.js'

/**
 * Possible return types from CEL expressions
 */
export type CelValue = 
  | number          // int, uint, float
  | string          // string
  | boolean         // bool
  | null            // null
  | Array<any>      // list
  | Record<string, any> // map
  | Date            // timestamp
  | Duration        // duration
  | Uint8Array      // bytes

const parserInstance = new CelParser()

export type Success = {
  isSuccess: true
  cst: CstNode
}

export type Failure = {
  isSuccess: false
  errors: string[]
}

export type ParseResult = Success | Failure

export function parse(expression: string): ParseResult {
  const lexResult = CELLexer.tokenize(expression)
  parserInstance.input = lexResult.tokens
  const cst = parserInstance.expr()

  if (parserInstance.errors.length > 0) {
    return {
      isSuccess: false,
      errors: parserInstance.errors.map((e) => e.message),
    }
  }

  return { isSuccess: true, cst }
}

export function evaluate(
  expression: string | CstNode,
  context?: Record<string, unknown>,
  functions?: Record<string, CallableFunction>,
  container?: string,
): CelValue {
  const result =
    typeof expression === 'string'
      ? parse(expression)
      : <Success>{ isSuccess: true, cst: expression }
  const toAstVisitorInstance = new CelVisitor(context, functions, container)

  if (!result.isSuccess) {
    throw new CelParseError(
      'Given string is not a valid CEL expression: ' + result.errors.join(', '),
    )
  }

  return toAstVisitorInstance.visit(result.cst) as CelValue
}
