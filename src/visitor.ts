import { CelParser } from './parser.js'

import {
  AdditionCstChildren,
  AtomicExpressionCstChildren,
  ConditionalAndCstChildren,
  ConditionalOrCstChildren,
  ExprCstChildren,
  MacrosExpressionCstChildren,
  ICstNodeVisitor,
  IdentifierDotExpressionCstChildren,
  IdentifierExpressionCstChildren,
  IndexExpressionCstChildren,
  ListExpressionCstChildren,
  MultiplicationCstChildren,
  ParenthesisExpressionCstChildren,
  RelationCstChildren,
  UnaryExpressionCstChildren,
  MapKeyValuesCstChildren,
  MapExpressionCstChildren,
} from './cst-definitions.js'

import { CelType, getCelType, getPosition, getResult, getUnaryResult } from './helper.js'
import { CelEvaluationError  } from './index.js'

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

const size = (arr: unknown) => {
  switch (getCelType(arr)) {
    case CelType.list:
    case CelType.string:
      // @ts-expect-error type assertion error
      return arr.length
    case CelType.map:
      // @ts-expect-error type assertion error
      return Object.keys(arr).length
    default:
      throw new CelEvaluationError(`invalid_argument: ${arr}`)
  } 
}

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

  listExpression(ctx: ListExpressionCstChildren) {
    const result = []
    if (!ctx.lhs) {
      return []
    }

    const left = this.visit(ctx.lhs)

    result.push(left)
    if (ctx.rhs) {
      for (const rhsOperand of ctx.rhs) {
        const right = this.visit(rhsOperand)
        result.push(right)
      }
    }

    if(!ctx.Index) {
      return result
    }

    const index = this.visit(ctx.Index)

    const indexType = getCelType(index)
    if (indexType != CelType.int && indexType != CelType.uint ) {
      throw new CelEvaluationError(`invalid_argument: ${index}`)
    }

    if (index < 0 || index >= result.length) {
      throw new CelEvaluationError(`Index out of bounds: ${index}`)
    }

    return result[index]
  }

  mapExpression(ctx: MapExpressionCstChildren) {
    const mapExpression: {[key: string]: unknown} = {}
    if (!ctx.keyValues) {
      return {}
    }
    let valueType: string = ''
    for (const keyValuePair of ctx.keyValues) {
      const [key, value] = this.visit(keyValuePair)
      if (valueType === '') {
        valueType = getCelType(value)
      }
      if (getCelType(key) != CelType.string) {
        throw new CelEvaluationError(`invalid_argument: ${key}`)
      }
      if (valueType !== getCelType(value)) {
        throw new CelEvaluationError(`invalid_argument: ${value}`)
      }
      mapExpression[key] = value
    }

    if(!ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
      return mapExpression
    }

    return this.getIndexSection(ctx, mapExpression)
  }

  private getIndexSection(ctx: MapExpressionCstChildren | IdentifierExpressionCstChildren, mapExpression: unknown) {
    const expressions = [
      ...(ctx.identifierDotExpression || []),
      ...(ctx.identifierIndexExpression || []),
    ].sort((a, b) => (getPosition(a) > getPosition(b) ? 1 : -1))

    return expressions.reduce((acc: unknown, expression) => {
      if (expression.name === 'identifierDotExpression') {
        return this.getIdentifier(acc, expression.children.Identifier[0].image)
      }

      const index = this.visit(expression.children.expr[0])
      return this.getIdentifier(acc, index)
    }, mapExpression)
  }

  mapKeyValues(children: MapKeyValuesCstChildren): [string, unknown] {
    const key = this.visit(children.key)
    const value = this.visit(children.value)
    return [key, value]
  }

  macrosExpression(ctx: MacrosExpressionCstChildren): unknown {
    const macrosIdentifier = ctx.MacrosIdentifier[0]
    // eslint-disable-next-line sonarjs/no-small-switch
    switch (macrosIdentifier.image) {
      case 'size':
        return ctx.arg ? size(this.visit(ctx.arg)) : 0
      default:
        throw new Error(`Macros ${macrosIdentifier.image} not recognized`)
    }
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

    if (ctx.listExpression) {
      return this.visit(ctx.listExpression)
    }

    if (ctx.mapExpression) {
      return this.visit(ctx.mapExpression)
    }

    if (ctx.macrosExpression) {
      return this.visit(ctx.macrosExpression)
    }

    throw new Error('Atomic expression not recognized')
  }

  identifierExpression(ctx: IdentifierExpressionCstChildren): unknown {
    const data = this.context
    const result = this.getIdentifier(data, ctx.Identifier[0].image)


    if (!ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
      return result
    }

    return this.getIndexSection(ctx, result)
  }

  identifierDotExpression(
    ctx: IdentifierDotExpressionCstChildren,
    param: unknown
  ): unknown {
    const identifierName = ctx.Identifier[0].image
    return this.getIdentifier(param, identifierName)
  }

  indexExpression(
    ctx: IndexExpressionCstChildren
  ): unknown {
    return this.visit(ctx.expr)
  }

  getIdentifier(searchContext: unknown, identifier: string): unknown {
    if (typeof searchContext !== 'object' || searchContext === null) {
      throw new Error(
        `Cannot obtain "${identifier}" from non-object context: ${searchContext}`
      )
    }

    const value = (searchContext as Record<string, unknown>)[identifier]

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
