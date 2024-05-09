import { createToken, Lexer } from 'chevrotain'

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /\s+/,
  group: Lexer.SKIPPED,
})

export const CloseParenthesis = createToken({
  name: 'CloseParenthesis',
  pattern: /\)/,
})

export const OpenParenthesis = createToken({
  name: 'OpenParenthesis',
  pattern: /\(/,
})

export const OpenBracket = createToken({ name: 'OpenBracket', pattern: /\[/ })

export const CloseBracket = createToken({ name: 'CloseBracket', pattern: /\]/ })

export const OpenCurlyBracket = createToken({
  name: 'OpenCurlyBracket',
  pattern: /{/,
})

export const CloseCurlyBracket = createToken({
  name: 'CloseCurlyBracket',
  pattern: /}/,
})

export const Dot = createToken({ name: 'Dot', pattern: /\./ })

export const Comma = createToken({ name: 'Comma', pattern: /,/ })

export const Colon = createToken({ name: 'Colon', pattern: /:/ })

export const Float = createToken({
  name: 'Float',
  pattern: /-?\d+\.\d+/,
})

export const Integer = createToken({ name: 'Integer', pattern: /0|[1-9]\d*/ })

export const BooleanLiteral = createToken({
  name: 'BooleanLiteral',
  pattern: /true|false/,
})

export const True = createToken({
  name: 'True',
  pattern: /true/,
  categories: BooleanLiteral,
})

export const False = createToken({
  name: 'False',
  pattern: /false/,
  categories: BooleanLiteral,
})

export const Null = createToken({ name: 'Null', pattern: /null/ })

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"(?:[^"\\]|\\.)*"/,
})

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

export const LogicalOrOperator = createToken({
  name: 'LogicalOrOperator',
  pattern: /\|\|/,
})

export const LogicalAndOperator = createToken({
  name: 'LogicalAndOperator',
  pattern: /&&/,
})

export const UnaryOperator = createToken({
  name: 'UnaryOperator',
  pattern: Lexer.NA,
})

export const LogicalNotOperator = createToken({
  name: 'LogicalNotOperator',
  pattern: /!/,
  categories: UnaryOperator,
})

export const ComparisonOperator = createToken({
  name: 'ComparisonOperator',
  pattern: Lexer.NA,
})

export const Equals = createToken({
  name: 'Equals',
  pattern: /==/,
  categories: ComparisonOperator,
})

export const NotEquals = createToken({
  name: 'NotEquals',
  pattern: /!=/,
  categories: ComparisonOperator,
})

export const GreaterOrEqualThan = createToken({
  name: 'GreaterOrEqualThan',
  pattern: />=/,
  categories: ComparisonOperator,
})

export const LessOrEqualThan = createToken({
  name: 'LessOrEqualThan',
  pattern: /<=/,
  categories: ComparisonOperator,
})

export const GreaterThan = createToken({
  name: 'GreaterThan',
  pattern: />/,
  categories: ComparisonOperator,
})

export const LessThan = createToken({
  name: 'LessThan',
  pattern: /</,
  categories: ComparisonOperator,
})

export const In = createToken({
  name: 'In',
  pattern: /in/,
  categories: ComparisonOperator,
})

export const MultiplicationOperator = createToken({
  name: 'MultiplicationOperator',
  pattern: Lexer.NA,
})

export const MultiplicationToken = createToken({
  name: 'MultiplicationToken',
  pattern: /\*/,
  categories: MultiplicationOperator,
})

export const Division = createToken({
  name: 'Division',
  pattern: /\//,
  categories: MultiplicationOperator,
})

export const Modulo = createToken({
  name: 'Modulo',
  pattern: /%/,
  categories: MultiplicationOperator,
})

export const AdditionOperator = createToken({
  name: 'AdditionOperator',
  pattern: Lexer.NA,
})

export const Plus = createToken({
  name: 'Plus',
  pattern: /\+/,
  categories: AdditionOperator,
})

export const Minus = createToken({
  name: 'Minus',
  pattern: /-/,
  categories: [AdditionOperator, UnaryOperator],
})

export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
})

// The order of tokens is important
export const allTokens = [
  WhiteSpace,

  CloseParenthesis,
  OpenParenthesis,
  OpenBracket,
  CloseBracket,
  OpenCurlyBracket,
  CloseCurlyBracket,
  Dot,
  Comma,
  Colon,

  Float,
  Integer,
  True,
  False,
  Null,
  StringLiteral,
  ReservedIdentifiers,

  LogicalOrOperator,
  LogicalAndOperator,

  ComparisonOperator,
  Equals,
  NotEquals,
  GreaterOrEqualThan,
  LessOrEqualThan,
  GreaterThan,
  LessThan,
  In,

  UnaryOperator,
  LogicalNotOperator,

  MultiplicationOperator,
  MultiplicationToken,
  Division,
  Modulo,

  AdditionOperator,
  Plus,
  Minus,

  Identifier,
]

export const CELLexer = new Lexer(allTokens)
