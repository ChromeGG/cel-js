import { CELLexer } from './tokens.js'
import { CelParser } from './parser.js'
import { CelVisitor } from './visitor.js'

const parserInstance = new CelParser()
// Our visitor has no state, so a single instance is sufficient.

export function parse(expression: string, context?: Record<string, unknown>) {
  const lexResult = CELLexer.tokenize(expression)
  parserInstance.input = lexResult.tokens

  const cst = parserInstance.expr()

  const toAstVisitorInstance = new CelVisitor(context)
  if (parserInstance.errors.length > 0) {
    throw Error(
      'Cannot parse CEL expression\n' + parserInstance.errors[0].message
    )
  }

  return toAstVisitorInstance.visit(cst) as unknown
}
