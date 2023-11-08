import { createToken, Lexer } from 'chevrotain'

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
})

export const OpenParenthesis = createToken({
  name: 'OpenParenthesis',
  pattern: /\(/,
})

export const CloseParenthesis = createToken({
  name: 'CloseParenthesis',
  pattern: /\)/,
})

export const Equals = createToken({ name: 'Equals', pattern: /=/ })
export const GreaterThan = createToken({ name: "GreaterThan", pattern: />/ });
export const LessThan = createToken({ name: "LessThan", pattern: /</ });

export const Integer = createToken({ name: 'Integer', pattern: /0|[1-9]\d*/ })

export const Plus = createToken({ name: 'Plus', pattern: /\+/ })
export const Minus = createToken({ name: 'Minus', pattern: /-/ })

// The order of tokens is important
export const allTokens = [
  WhiteSpace,
  OpenParenthesis,
  CloseParenthesis,
  Equals,
  GreaterThan,
  LessThan,
  Integer,
  Plus,
  Minus,
]

export const CELLexer = new Lexer(allTokens)
