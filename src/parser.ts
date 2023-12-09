import { CstParser } from 'chevrotain'
import {
  GreaterThan,
  Integer,
  LessThan,
  allTokens,
  GreaterOrEqualThan,
  LessOrEqualThan,
  ReservedIdentifiers,
  Minus,
  Plus,
  Identifier,
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
      { ALT: () => this.CONSUME(GreaterOrEqualThan, { LABEL: 'gte' }) },
      { ALT: () => this.CONSUME(LessOrEqualThan, { LABEL: 'lte' }) },
      { ALT: () => this.CONSUME(GreaterThan, { LABEL: 'gt' }) },
      { ALT: () => this.CONSUME(LessThan, { LABEL: 'lt' }) },
    ])
  })

  private addition = this.RULE('addition', () => {
    this.SUBRULE(this.atomicExpression, { LABEL: 'lhs' })
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Plus, { LABEL: 'plus' }) },
        { ALT: () => this.CONSUME(Minus, { LABEL: 'minus' }) },
      ])
      this.SUBRULE2(this.addition, { LABEL: 'rhs' })
    })
  })

  private atomicExpression = this.RULE('atomicExpression', () => {
    this.OR([
      { ALT: () => this.CONSUME(Integer) },
      { ALT: () => this.CONSUME(ReservedIdentifiers) },
      { ALT: () => this.CONSUME(Identifier) },
      // { ALT: () => this.SUBRULE(this.expr)}
    ])
  })
}
