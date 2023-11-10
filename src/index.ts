import { CELLexer } from './tokens'
import { CelParser } from './parser'
import { CelVisitor } from './visitor'

// A new parser instance with CST output enabled.
const parserInstance = new CelParser()
// Our visitor has no state, so a single instance is sufficient.
const toAstVisitorInstance = new CelVisitor()

function toAst(inputText: string) {
  // Lex
  const lexResult = CELLexer.tokenize(inputText)
  parserInstance.input = lexResult.tokens

  // Automatic CST created when parsing
  const cst = parserInstance.celExpression()
  // console.log('cst:', cst)
  if (parserInstance.errors.length > 0) {
    throw Error(
      'Sad sad panda, parsing errors detected!\n' +
        parserInstance.errors[0].message
    )
  }

  // Visit
  const ast = toAstVisitorInstance.visit(cst)
  return ast
}

const result = toAst('1 < 2')
console.log('result:', result)
