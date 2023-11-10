import { CstParser } from 'chevrotain'
import { GreaterThan, Identifier, Integer, LessThan, allTokens } from './tokens'

export class CelParser extends CstParser {
  constructor() {
    super(allTokens)

    const $ = this

    $.RULE('celExpression', () => {
      $.SUBRULE($.comparisonExpression)
    })

    $.RULE('comparisonExpression', () => {
      $.SUBRULE($.atomicExpression, { LABEL: 'lhs' })
      $.SUBRULE($.comparisonOperator)
      $.SUBRULE2($.atomicExpression, { LABEL: 'rhs' })
    })

    $.RULE('comparisonOperator', () => {
      $.OR([
        { ALT: () => $.CONSUME(GreaterThan) },
        { ALT: () => $.CONSUME(LessThan) },
      ])
    })

    $.RULE('atomicExpression', () => {
      $.OR([
        { ALT: () => $.CONSUME(Integer) },
        { ALT: () => $.CONSUME(Identifier) },
      ])
    })

    this.performSelfAnalysis()
  }
}
