import { CstParser } from 'chevrotain'
import {
  HexUnsignedInteger,
  HexInteger,
  UnsignedInteger,
  Integer,
  allTokens,
  AdditionOperator,
  MultiplicationOperator,
  Identifier,
  BooleanLiteral,
  Null,
  OpenParenthesis,
  CloseParenthesis,
  StringLiteral,
  Float,
  LogicalAndOperator,
  LogicalOrOperator,
  ComparisonOperator,
  UnaryOperator,
  Dot,
  CloseBracket,
  OpenBracket,
  Comma,
  OpenCurlyBracket,
  CloseCurlyBracket,
  Colon,
  QuestionMark,
} from './tokens.js'

export class CelParser extends CstParser {
  constructor() {
    super(allTokens)
    this.performSelfAnalysis()
  }

  public expr = this.RULE('expr', () => {
    this.SUBRULE(this.conditionalOr, { LABEL: 'conditionalOr' })
    this.OPTION(() => {
      this.CONSUME(QuestionMark)
      this.SUBRULE(this.expr, { LABEL: 'lhs' })
      this.CONSUME(Colon)
      this.SUBRULE2(this.expr, { LABEL: 'rhs' })
    })
  })

  private conditionalAnd = this.RULE('conditionalAnd', () => {
    this.SUBRULE(this.relation, { LABEL: 'lhs' })
    this.MANY(() => {
      this.CONSUME(LogicalAndOperator)
      this.SUBRULE2(this.relation, { LABEL: 'rhs' })
    })
  })

  private conditionalOr = this.RULE('conditionalOr', () => {
    this.SUBRULE(this.conditionalAnd, { LABEL: 'lhs' })
    this.MANY(() => {
      this.CONSUME(LogicalOrOperator)
      this.SUBRULE2(this.conditionalAnd, { LABEL: 'rhs' })
    })
  })

  private relation = this.RULE('relation', () => {
    this.SUBRULE(this.addition, { LABEL: 'lhs' })
    this.OPTION(() => {
      this.CONSUME(ComparisonOperator)
      this.SUBRULE2(this.addition, { LABEL: 'rhs' })
    })
  })

  private addition = this.RULE('addition', () => {
    this.SUBRULE(this.multiplication, { LABEL: 'lhs' })
    this.MANY(() => {
      this.CONSUME(AdditionOperator)
      this.SUBRULE2(this.multiplication, { LABEL: 'rhs' })
    })
  })

  private multiplication = this.RULE('multiplication', () => {
    this.SUBRULE(this.unaryExpression, { LABEL: 'lhs' })
    this.MANY(() => {
      this.CONSUME(MultiplicationOperator)
      this.SUBRULE2(this.unaryExpression, { LABEL: 'rhs' })
    })
  })

  private unaryExpression = this.RULE('unaryExpression', () => {
    this.MANY(() => {
      this.CONSUME(UnaryOperator)
    })
    this.SUBRULE(this.atomicExpression)
  })

  private parenthesisExpression = this.RULE('parenthesisExpression', () => {
    this.CONSUME(OpenParenthesis, { LABEL: 'open' })
    this.SUBRULE(this.expr)
    this.CONSUME(CloseParenthesis, { LABEL: 'close' })
  })

  private listExpression = this.RULE('listExpression', () => {
    this.CONSUME(OpenBracket)
    this.OPTION(() => {
      this.SUBRULE(this.expr, { LABEL: 'lhs' })
      this.MANY(() => {
        this.CONSUME(Comma)
        this.SUBRULE2(this.expr, { LABEL: 'rhs' })
      })
    })
    this.CONSUME(CloseBracket)
    this.OPTION2(() => {
      this.SUBRULE(this.indexExpression, { LABEL: 'Index' })
    })
  })

  private mapExpression = this.RULE('mapExpression', () => {
    this.CONSUME(OpenCurlyBracket)
    this.MANY(() => {
      this.SUBRULE(this.mapKeyValues, { LABEL: 'keyValues' })
    })
    this.CONSUME(CloseCurlyBracket)
    this.MANY2(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.identifierDotExpression) },
        {
          ALT: () =>
            this.SUBRULE(this.indexExpression, {
              LABEL: 'identifierIndexExpression',
            }),
        },
      ])
    })
  })

  private mapKeyValues = this.RULE('mapKeyValues', () => {
    this.SUBRULE(this.expr, { LABEL: 'key' })
    this.CONSUME(Colon)
    this.SUBRULE2(this.expr, { LABEL: 'value' })
    this.OPTION(() => {
      this.CONSUME(Comma)
    })
  })

  private macrosExpression = this.RULE('macrosExpression', () => {
    this.CONSUME(Identifier)
    this.CONSUME(OpenParenthesis)
    this.OPTION(() => {
      this.SUBRULE(this.expr, { LABEL: 'arg' })
      this.MANY(() => {
        this.CONSUME(Comma)
        this.SUBRULE2(this.expr, { LABEL: 'args' })
      })
    })
    this.CONSUME(CloseParenthesis)
  })

  private identifierExpression = this.RULE('identifierExpression', () => {
    this.CONSUME(Identifier)
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.identifierDotExpression) },
        {
          ALT: () =>
            this.SUBRULE(this.indexExpression, {
              LABEL: 'identifierIndexExpression',
            }),
        },
      ])
    })
  })

  private identifierDotExpression = this.RULE('identifierDotExpression', () => {
    this.CONSUME(Dot)
    this.CONSUME(Identifier)
    // Optional method call with arguments (for collection macros)
    this.OPTION(() => {
      this.CONSUME(OpenParenthesis)
      this.OPTION2(() => {
        this.SUBRULE(this.expr, { LABEL: 'arg' })
        this.MANY(() => {
          this.CONSUME(Comma)
          this.SUBRULE2(this.expr, { LABEL: 'args' })
        })
      })
      this.CONSUME(CloseParenthesis)
    })
  })

  private indexExpression = this.RULE('indexExpression', () => {
    this.CONSUME(OpenBracket)
    this.SUBRULE(this.expr)
    this.CONSUME(CloseBracket)
  })

  private atomicExpression = this.RULE('atomicExpression', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.parenthesisExpression) },
      { ALT: () => this.CONSUME(BooleanLiteral) },
      { ALT: () => this.CONSUME(Null) },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(Float) },
      { ALT: () => this.CONSUME(HexUnsignedInteger) },
      { ALT: () => this.CONSUME(HexInteger) },
      { ALT: () => this.CONSUME(UnsignedInteger) },
      { ALT: () => this.CONSUME(Integer) },
      { ALT: () => this.SUBRULE(this.listExpression) },
      { ALT: () => this.SUBRULE(this.mapExpression) },
      { ALT: () => this.SUBRULE(this.macrosExpression) },
      { ALT: () => this.SUBRULE(this.identifierExpression) },
    ])
  })
}
