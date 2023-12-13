// BaseVisitor constructors are accessed via a parser instance.
import { CelParser } from './parser.js'

import {
  AdditionCstChildren,
  AtomicExpressionCstChildren,
  ConditionalAndCstChildren,
  ConditionalOrCstChildren,
  ExprCstChildren,
  ICstNodeVisitor,
  MultiplicationCstChildren,
  ParenthesisExpressionCstChildren,
  RelOpCstChildren,
  RelationCstChildren,
} from './cst-definitions.js'

import { tokenMatcher } from 'chevrotain'
import { Division, MultiplicationToken, Plus } from './tokens.js'

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

type RelOps = '==' | '!=' | '>=' | '<=' | '>' | '<'

export class CelVisitor
  extends BaseCelVisitor
  implements ICstNodeVisitor<void, unknown>
{
  constructor(context?: Record<string, unknown>) {
    super()
    this.context = context || {}
    this.validateVisitor()
  }

  private context: Record<string, unknown>

  public expr(ctx: ExprCstChildren) {
    return this.visit(ctx.conditionalOr) as unknown
  }

  conditionalOr(ctx: ConditionalOrCstChildren): boolean {
    let left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand) => {
        const rhsValue = this.visit(rhsOperand)

        left = left || rhsValue
      })
    }

    return left
  }

  conditionalAnd(ctx: ConditionalAndCstChildren): boolean {
    let left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand) => {
        const rhsValue = this.visit(rhsOperand)

        left = left && rhsValue
      })
    }

    return left
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
        case '==':
          return left === right
        case '!=':
          return left !== right
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
    } else if (ctx.eq) {
      return '=='
    } else if (ctx.neq) {
      return '!='
    }

    throw new Error('Comparison operator not recognized')
  }

  addition(ctx: AdditionCstChildren): unknown {
    let left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        const rhsValue = this.visit(rhsOperand)
        const operator = ctx.AdditionOperator![idx]

        if (tokenMatcher(operator, Plus)) {
          left += rhsValue
        } else {
          left -= rhsValue
        }
      })
    }

    return left
  }

  multiplication(ctx: MultiplicationCstChildren) {
    let left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        const rhsValue = this.visit(rhsOperand)
        const operator = ctx.MultiplicationOperator![idx]

        if (tokenMatcher(operator, MultiplicationToken)) {
          left *= rhsValue
        } else if (tokenMatcher(operator, Division)) {
          left /= rhsValue
        } else {
          left %= rhsValue
        }
      })
    }

    return left
  }

  parenthesisExpression(ctx: ParenthesisExpressionCstChildren) {
    return this.visit(ctx.expr)
  }

  // these two visitor methods will return a string.
  atomicExpression(ctx: AtomicExpressionCstChildren) {
    if (ctx.Null) {
      return null
    }

    if (ctx.parenthesisExpression) {
      return this.visit(ctx.parenthesisExpression)
    }

    if (ctx.StringLiteral) {
      return ctx.StringLiteral[0].image.slice(1, -1)
    }

    if (ctx.BooleanLiteral) {
      return ctx.BooleanLiteral[0].image === 'true'
    }

    if (ctx.Float) {
      return parseFloat(ctx.Float[0].image)
    }

    if (ctx.Integer) {
      return parseInt(ctx.Integer[0].image)
    }

    if (ctx.ReservedIdentifiers) {
      throw new Error('Detected reserved identifier. This is not allowed')
    }

    if (ctx.Identifier) {
      return this.identifier(ctx)
    }

    throw new Error('Atomic expression not recognized')
  }

  identifier(ctx: AtomicExpressionCstChildren): unknown {
    const identifier = ctx.Identifier![0].image // must be defined if we are in this method
    const value = this.context[identifier]

    if (value === undefined) {
      const context = JSON.stringify(this?.context)

      if (context === '{}') {
        throw new Error(
          `Identifier "${identifier}" not found, no context passed`
        )
      }
      throw new Error(
        `Identifier "${identifier}" not found in context: ${context}`
      )
    }

    return value
  }
}
