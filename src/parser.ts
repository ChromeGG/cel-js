import { CstParser } from 'chevrotain'
import {
  GreaterThan,
  Identifier,
  Integer,
  LessThan,
  allTokens,
  Dot,
  OpenBracket,
  CloseBracket,
  StringLiteral,
  GreaterOrEqualThan,
  LessOrEqualThan,
} from './tokens.js'

export class CelParser extends CstParser {
  constructor() {
    super(allTokens)
    this.performSelfAnalysis()
  }

  public celExpression = this.RULE('celExpression', () => {
    this.SUBRULE(this.comparisonExpression)
  })

  private comparisonExpression = this.RULE('comparisonExpression', () => {
    this.SUBRULE(this.atomicExpression, { LABEL: 'lhs' })
    this.SUBRULE(this.comparisonOperator)
    this.SUBRULE2(this.atomicExpression, { LABEL: 'rhs' })
  })

  private comparisonOperator = this.RULE('comparisonOperator', () => {
    this.OR([
      { ALT: () => this.CONSUME(GreaterOrEqualThan) },
      { ALT: () => this.CONSUME1(GreaterThan) },
      { ALT: () => this.CONSUME2(LessOrEqualThan) },
      { ALT: () => this.CONSUME3(LessThan) },
    ])
  })

  private identifier = this.RULE('identifier', () => {
    this.CONSUME(Identifier)
    this.MANY(() => {
      this.OR([
        {
          ALT: () => {
            this.CONSUME1(Dot), this.CONSUME2(Identifier)
          },
        },
        {
          ALT: () => {
            this.CONSUME3(OpenBracket)
            this.OR1([
              { ALT: () => this.CONSUME4(StringLiteral) },
              { ALT: () => this.CONSUME5(Identifier) },
            ])
            this.CONSUME6(CloseBracket)
          },
        },
      ])
    })
  })

  private atomicExpression = this.RULE('atomicExpression', () => {
    this.OR([
      { ALT: () => this.CONSUME(Integer) },
      { ALT: () => this.SUBRULE(this.identifier) },
    ])
  })
}
