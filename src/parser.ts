import { CstParser } from 'chevrotain'
import {
  GreaterThan,
  Integer,
  LessThan,
  allTokens,
  GreaterOrEqualThan,
  LessOrEqualThan,
  ReservedIdentifiers,
  AdditionOperator,
  MultiplicationOperator,
  Identifier,
  BooleanLiteral,
  Null,
  OpenParenthesis,
  CloseParenthesis,
  Equals,
  NotEquals,
  StringLiteral,
} from './tokens.js'

export class CelParser extends CstParser {
  constructor() {
    super(allTokens)
    this.performSelfAnalysis()
  }

  public expr = this.RULE('expr', () => {
    this.SUBRULE(this.relation)
  })

  private relation = this.RULE('relation', () => {
    this.SUBRULE(this.addition, { LABEL: 'lhs' })
    this.OPTION(() => {
      this.SUBRULE(this.relOp)
      this.SUBRULE2(this.addition, { LABEL: 'rhs' })
    })
  })

  private relOp = this.RULE('relOp', () => {
    this.OR([
      { ALT: () => this.CONSUME(Equals, { LABEL: 'eq' }) },
      { ALT: () => this.CONSUME(NotEquals, { LABEL: 'neq' }) },
      { ALT: () => this.CONSUME(GreaterOrEqualThan, { LABEL: 'gte' }) },
      { ALT: () => this.CONSUME(LessOrEqualThan, { LABEL: 'lte' }) },
      { ALT: () => this.CONSUME(GreaterThan, { LABEL: 'gt' }) },
      { ALT: () => this.CONSUME(LessThan, { LABEL: 'lt' }) },
    ])
  })

  private addition = this.RULE('addition', () => {
    this.SUBRULE(this.multiplication, { LABEL: 'lhs' })
    this.MANY(() => {
      this.CONSUME(AdditionOperator)
      this.SUBRULE2(this.multiplication, { LABEL: 'rhs' })
    })
  })

  private multiplication = this.RULE('multiplication', () => {
    this.SUBRULE(this.atomicExpression, { LABEL: 'lhs' })
    this.MANY(() => {
      this.CONSUME(MultiplicationOperator)
      this.SUBRULE2(this.atomicExpression, { LABEL: 'rhs' })
    })
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
      { ALT: () => this.CONSUME(Integer) },
      { ALT: () => this.CONSUME(ReservedIdentifiers) },
      { ALT: () => this.CONSUME(Identifier) },
    ])
  })
}
