import { CstParser } from 'chevrotain'
import { GreaterThan, Integer, LessThan, allTokens } from './tokens'

export class CelParser extends CstParser {
  constructor() {
    super(allTokens)

    const $ = this

    $.RULE('atomicExpression', () => {
      $.OR([
        { ALT: () => $.CONSUME(Integer) },
        // { ALT: () => $.CONSUME(Identifier) },
      ])
    })

    $.RULE('relationalOperator', () => {
      $.OR([
        { ALT: () => $.CONSUME(GreaterThan) },
        { ALT: () => $.CONSUME(LessThan) },
      ])
    })

    $.RULE('expression', () => {
      $.SUBRULE($.atomicExpression, { LABEL: 'lhs' })
      $.SUBRULE($.relationalOperator)
      $.SUBRULE2($.atomicExpression, { LABEL: 'rhs' }) // note the '2' suffix to distinguish
      // from the 'SUBRULE(atomicExpression)'
      // 2 lines above.
    })

    this.performSelfAnalysis()
  }
}
