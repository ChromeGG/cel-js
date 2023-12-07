import { createToken, Lexer } from 'chevrotain'

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
})
export const Dot = createToken({ name: 'Dot', pattern: /\./ })

export const OpenBracket = createToken({ name: 'OpenBracket', pattern: /\[/ })

export const CloseBracket = createToken({ name: 'CloseBracket', pattern: /\]/ })

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^"\\]|\\.)*"/,
})

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

const ComparisonOperator = createToken({
  name: 'ComparisonOperator',
  pattern: Lexer.NA,
})

export const GreaterThan = createToken({
  name: 'GreaterThan',
  pattern: />/,
  categories: ComparisonOperator,
})
export const GreaterOrEqualThan = createToken({
  name: 'GreaterOrEqualThan',
  pattern: />=/,
  categories: ComparisonOperator,
})
export const LessThan = createToken({
  name: 'LessThan',
  pattern: /</,
  categories: ComparisonOperator,
})
export const LessOrEqualThan = createToken({
  name: 'LessOrEqualThan',
  pattern: /<=/,
  categories: ComparisonOperator,
})

export const Integer = createToken({ name: 'Integer', pattern: /0|[1-9]\d*/ })

export const Plus = createToken({ name: 'Plus', pattern: /\+/ })
export const Minus = createToken({ name: 'Minus', pattern: /-/ })

export const reservedIdentifiers = [
  'as',
  'break',
  'const',
  'continue',
  'else',
  'for',
  'function',
  'if',
  'import',
  'let',
  'loop',
  'package',
  'namespace',
  'return',
  'var',
  'void',
  'while',
]

const reserverIdentifiersPattern = reservedIdentifiers.join('|')

export const ReservedIdentifiers = createToken({
  name: 'ReservedIdentifiers',
  pattern: new RegExp(reserverIdentifiersPattern),
})

// The order of tokens is important
export const allTokens = [
  WhiteSpace,
  OpenParenthesis,
  CloseParenthesis,
  Equals,
  ReservedIdentifiers,
  Identifier,
  Dot,
  OpenBracket,
  CloseBracket,
  StringLiteral,
  Integer,
  Plus,
  Minus,
  GreaterOrEqualThan,
  LessOrEqualThan,
  GreaterThan,
  LessThan,
]

export const CELLexer = new Lexer(allTokens)
