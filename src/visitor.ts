// BaseVisitor constructors are accessed via a parser instance.
import { CelParser } from './parser.js'

import {
  AdditionCstChildren,
  AtomicExpressionCstChildren,
  ExprCstChildren,
  ICstNodeVisitor,
  RelOpCstChildren,
  RelationCstChildren,
} from './cst-definitions.js'
import get from 'lodash.get'

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

type RelOps = '>=' | '<=' | '>' | '<'

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

  public expr(ctx: ExprCstChildren) {
    return this.visit(ctx.relation) as unknown
  }

  relation(ctx: RelationCstChildren): boolean {
    const left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      const right = this.visit(ctx.rhs)
      const operator: RelOps = this.visit(ctx.relOp!) // relOp must be defined if rhs is defined

      switch (operator) {
        case '<':
          return left < right
        case '<=':
          return left <= right
        case '>':
          return left > right
        case '>=':
          return left >= right
        default:
          throw new Error('Comparison operator not recognized')
      }
    }

    return left
  }

  relOp(ctx: RelOpCstChildren): RelOps {
    if (ctx.gte) {
      return '>='
    } else if (ctx.lte) {
      return '<='
    } else if (ctx.gt) {
      return '>'
    } else if (ctx.lt) {
      return '<'
    }

    throw new Error('Comparison operator not recognized')
  }

  addition(ctx: AdditionCstChildren): unknown {
    const left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      const right = this.visit(ctx.rhs)
      const operator = ctx.plus ? '+' : '-'

      switch (operator) {
        case '+':
          return left + right
        case '-':
          return left - right
        default:
          throw new Error('Addition operator not recognized')
      }
    }

    return left
  }

  // these two visitor methods will return a string.
  atomicExpression(ctx: AtomicExpressionCstChildren) {
    if (ctx.Integer) {
      return parseInt(ctx.Integer[0].image)
    }

    if (ctx.ReservedIdentifiers) {
      throw new Error('Detected reserved identifier. This is not allowed')
    }

    throw new Error('Atomic expression not recognized')
  }

  identifier(ctx): unknown {
    const identifier = ctx.Identifier[0].image
    const value = get(this?.context, identifier)

    if (value === undefined) {
      const context = JSON.stringify(this?.context)
      throw new Error(
        `Identifier "${identifier}" not found in context: ${context}`
      )
    }

    return value
  }
}
