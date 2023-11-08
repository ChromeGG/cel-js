// BaseVisitor constructors are accessed via a parser instance.
import { tokenMatcher } from 'chevrotain'
import { CelParser } from './parser'
import { GreaterThan } from 'tokens'

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

export class CelVisitor extends BaseCelVisitor {
  constructor() {
    super()
    this.validateVisitor()
  }

  expression(ctx) {
    // visiting an array is equivalent to visiting its first element.
    return this.visit(ctx.comparisonExpression)
  }

  // The Ctx argument is the current CSTNode's children.
  comparisonExpression(ctx) {
    let result = this.visit(ctx.lhs)
    console.log('resultVIS:', result)

    // "rhs" key may be undefined as the grammar defines it as optional (MANY === zero or more).
    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand, idx) => {
        // there will be one operator for each rhs operand
        let rhsValue = this.visit(rhsOperand)
        let operator = ctx.comparisonOperator[idx]

        if (tokenMatcher(operator, GreaterThan)) {
          return result > rhsValue
        } else {
          return result < rhsValue
        }
      })
    }

    return result
  }

  // these two visitor methods will return a string.
  atomicExpression(ctx) {
    if (ctx.Integer) {
      return ctx.Integer[0].image
    } else {
      return ctx.Identifier[0].image
    }
  }

  comparisonOperator(ctx) {
    if (ctx.GreaterThan) {
      return ctx.GreaterThan[0].image
    } else {
      return ctx.LessThan[0].image
    }
  }
}

const myVisitorInstance = new CelVisitor()
