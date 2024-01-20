import { CstParser } from 'chevrotain'
import {
  Integer,
  allTokens,
  ReservedIdentifiers,
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
} from './tokens.js'

export class CelParser extends CstParser {
  constructor() {
    super(allTokens)
    this.performSelfAnalysis()
  }

  public expr = this.RULE('expr', () => {
    this.SUBRULE(this.conditionalOr)
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
      this.SUBRULE2(this.atomicExpression, { LABEL: 'rhs' })
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

  private atomicExpression = this.RULE('atomicExpression', () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.parenthesisExpression) },
      { ALT: () => this.CONSUME(BooleanLiteral) },
      { ALT: () => this.CONSUME(Null) },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(Float) },
      { ALT: () => this.CONSUME(Integer) },
      { ALT: () => this.CONSUME(ReservedIdentifiers) },
      { ALT: () => this.CONSUME(Identifier) },
    ])
  })
}
