import { CstParser } from 'chevrotain'
import { GreaterThan, Identifier, Integer, LessThan, allTokens } from './tokens'

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
      { ALT: () => this.CONSUME(GreaterThan) },
      { ALT: () => this.CONSUME(LessThan) },
    ])
  })

  private atomicExpression = this.RULE('atomicExpression', () => {
    this.OR([
      { ALT: () => this.CONSUME(Integer) },
      { ALT: () => this.CONSUME(Identifier) },
    ])
  })
}
