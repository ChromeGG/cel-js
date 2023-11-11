import { CELLexer } from './tokens'
import { CelParser } from './parser'
import { CelVisitor } from './visitor'

const parserInstance = new CelParser()
// Our visitor has no state, so a single instance is sufficient.
const toAstVisitorInstance = new CelVisitor()

export function parse(expression: string) {
  const lexResult = CELLexer.tokenize(expression)
  parserInstance.input = lexResult.tokens

  const cst = parserInstance.celExpression()

  if (parserInstance.errors.length > 0) {
    throw Error(
      'Sad sad panda, parsing errors detected!\n' +
        parserInstance.errors[0].message
    )
  }

  return toAstVisitorInstance.visit(cst) as unknown
}
