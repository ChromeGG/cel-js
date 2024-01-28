import { CelParser } from './parser.js'

import {
  AdditionCstChildren,
  AtomicExpressionCstChildren,
  ConditionalAndCstChildren,
  ConditionalOrCstChildren,
  ExprCstChildren,
  ICstNodeVisitor,
  IdentifierDotExpressionCstChildren,
  IdentifierExpressionCstChildren,
  IdentifierIndexExpressionCstChildren,
  MultiplicationCstChildren,
  ParenthesisExpressionCstChildren,
  RelationCstChildren,
  UnaryExpressionCstChildren,
} from './cst-definitions.js'

import { getPosition, getResult, getUnaryResult } from './helper.js'

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

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
        const right = this.visit(rhsOperand)
        const operator = ctx.LogicalOrOperator![0]

        left = getResult(operator, left, right)
      })
    }

    return left
  }

  conditionalAnd(ctx: ConditionalAndCstChildren): boolean {
    let left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand) => {
        const right = this.visit(rhsOperand)
        const operator = ctx.LogicalAndOperator![0]

        left = getResult(operator, left, right)
      })
    }

    return left
  }

  relation(ctx: RelationCstChildren): boolean {
    const left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      const right = this.visit(ctx.rhs)
      const operator = ctx.ComparisonOperator![0]

      // todo fix type assertion
      return getResult(operator, left, right) as boolean
    }

    return left
  }

  addition(ctx: AdditionCstChildren): unknown {
    let left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        const right = this.visit(rhsOperand)
        const operator = ctx.AdditionOperator![idx]

        left = getResult(operator, left, right)
      })
    }

    return left
  }

  multiplication(ctx: MultiplicationCstChildren) {
    let left = this.visit(ctx.lhs)

    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        const right = this.visit(rhsOperand)
        const operator = ctx.MultiplicationOperator![idx]

        left = getResult(operator, left, right)
      })
    }

    return left
  }

  unaryExpression(ctx: UnaryExpressionCstChildren): unknown {
    if (ctx.UnaryOperator) {
      const operator = ctx.UnaryOperator
      const operand = this.visit(ctx.atomicExpression)

      return getUnaryResult(operator, operand)
    }

    return this.visit(ctx.atomicExpression)
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

    if (ctx.identifierExpression) {
      return this.visit(ctx.identifierExpression)
      // return this.identifier(ctx)
    }

    throw new Error('Atomic expression not recognized')
  }

  identifierExpression(ctx: IdentifierExpressionCstChildren): unknown {
    const data = this.context
    let result = this.getIdentifier(data, ctx.Identifier[0].image)

    // ctx is an object with Dot and Index expressions grouped, but not sorted
    // for this reason we need to sort them by position, to handle `a.b["c"].d`
    const expressions = [
      ...(ctx.identifierDotExpression || []),
      ...(ctx.identifierIndexExpression || []),
    ].sort((a, b) => (getPosition(a) > getPosition(b) ? 1 : -1))

    result = expressions.reduce((acc, expression) => {
      if (expression.name === 'identifierDotExpression') {
        return this.getIdentifier(acc, expression.children.Identifier[0].image)
      }

      const index = this.visit(expression.children.expr[0])
      return this.getIdentifier(acc, index)
    }, result)

    return result
  }

  identifierDotExpression(
    ctx: IdentifierDotExpressionCstChildren,
    param: unknown
  ): unknown {
    const identifierName = ctx.Identifier[0].image
    return this.getIdentifier(param, identifierName)
  }

  identifierIndexExpression(
    ctx: IdentifierIndexExpressionCstChildren,
    param: unknown
  ): unknown {
    const index = this.visit(ctx.expr)
    return this.getIdentifier(param, index)
  }

  getIdentifier(searchContext: unknown, identifier: string): unknown {
    if (typeof identifier !== 'string') {
      // TODO make this error more specific
      throw new Error('Identifier must be a string')
    }

    // TODO make it type safe
    const value = searchContext![identifier]

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
