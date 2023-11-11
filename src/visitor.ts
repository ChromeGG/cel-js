// BaseVisitor constructors are accessed via a parser instance.
import { IToken, tokenMatcher } from 'chevrotain'
import { CelParser } from './parser'
import { GreaterThan, LessThan } from 'tokens'
import {
  AtomicExpressionCstChildren,
  CelExpressionCstChildren,
  ComparisonExpressionCstChildren,
  ComparisonOperatorCstChildren,
  ICstNodeVisitor,
} from 'cst-definitions'

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

export class CelVisitor
  extends BaseCelVisitor
  implements ICstNodeVisitor<void, unknown>
{
  constructor() {
    super()
    this.validateVisitor()
  }

  celExpression(ctx: CelExpressionCstChildren) {
    return this.visit(ctx.comparisonExpression) as unknown
  }

  comparisonExpression(ctx: ComparisonExpressionCstChildren): boolean {
    const left = this.visit(ctx.lhs) as number
    const right = this.visit(ctx.rhs) as number
    console.log('right:', right)
    console.log('right:', typeof right)

    const operator = this.visit(ctx.comparisonOperator) as IToken

    if (tokenMatcher(operator, GreaterThan)) {
      return left > right
    } else {
      return left < right
    }
  }

  // these two visitor methods will return a string.
  atomicExpression(ctx: AtomicExpressionCstChildren) {
    if (ctx.Integer) {
      return parseInt(ctx.Integer[0].image)
    }
    if (ctx.Identifier) {
      return ctx.Identifier[0].image
    }

    throw new Error('Atomic expression not recognized')
  }

  comparisonOperator(ctx: ComparisonOperatorCstChildren) {
    if (ctx.GreaterThan) {
      return GreaterThan
    } else {
      return LessThan
    }
  }
}
