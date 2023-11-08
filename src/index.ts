import { CELLexer } from './tokens'
import { CelParser } from './parser'

const parser = new CelParser()

function parseInput(text: string) {
  const lexingResult = CELLexer.tokenize(text)

  // "input" is a setter which will reset the parser's state.
  parser.input = lexingResult.tokens
  const res = parser.expression()
  console.log('res:', res)
  
  if (parser.errors.length > 0) {
    console.log(parser.errors)
    throw new Error('sad sad panda, Parsing errors detected')
  }
}

const inputText = '1 > 2'

// const lexingResult = CELLexer.tokenize(inputText)
const output = parseInput(inputText)
