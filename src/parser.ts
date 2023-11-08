import { CstParser } from 'chevrotain'
import { GreaterThan, Integer, LessThan, allTokens } from './tokens'

export class CelParser extends CstParser {
  constructor() {
    super(allTokens)

    const $ = this

    $.RULE('expression', () => {
      $.SUBRULE($.comparisonExpression)
    })

    $.RULE('atomicExpression', () => {
      $.OR([
        { ALT: () => $.CONSUME(Integer) },
        // { ALT: () => $.CONSUME(Identifier) },
      ])
    })

    $.RULE('comparisonOperator', () => {
      $.OR([
        { ALT: () => $.CONSUME(GreaterThan) },
        { ALT: () => $.CONSUME(LessThan) },
      ])
    })

    $.RULE('comparisonExpression', () => {
      $.SUBRULE($.atomicExpression, { LABEL: 'lhs' })
      $.SUBRULE($.comparisonOperator)
      $.SUBRULE2($.atomicExpression, { LABEL: 'rhs' })
    })

    this.performSelfAnalysis()
  }
}
