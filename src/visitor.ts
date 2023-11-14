// BaseVisitor constructors are accessed via a parser instance.
import { IToken, tokenMatcher } from 'chevrotain'
import { CelParser } from './parser.js'
import { GreaterThan, LessThan } from './tokens.js'
import {
  AtomicExpressionCstChildren,
  CelExpressionCstChildren,
  ComparisonExpressionCstChildren,
  ComparisonOperatorCstChildren,
  ICstNodeVisitor,
  IdentifierCstChildren,
} from './cst-definitions.js'
import get from 'lodash.get'

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

export class CelVisitor
  extends BaseCelVisitor
  implements ICstNodeVisitor<void, unknown>
{
  constructor(context?: Record<string, unknown>) {
    super()
    this.context = context
    this.validateVisitor()
  }

  private context?: Record<string, unknown>

  celExpression(ctx: CelExpressionCstChildren) {
    return this.visit(ctx.comparisonExpression) as unknown
  }

  comparisonExpression(ctx: ComparisonExpressionCstChildren): boolean {
    const left = this.visit(ctx.lhs) as number
    const right = this.visit(ctx.rhs) as number

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

    if (ctx.identifier) {
      return this.visit(ctx.identifier)
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

  identifier(ctx: IdentifierCstChildren): unknown {
    const identifier = ctx.Identifier[0].image
    console.log('identifier:', identifier)
    const value = get(this?.context, identifier)
    console.log('identifier:', identifier)
    console.log('this?.context:', this?.context)
    console.log('value:', value)

    if (value === undefined) {
      throw new Error(`Identifier ${identifier} not found in context`)
    }

    return value
  }
}
