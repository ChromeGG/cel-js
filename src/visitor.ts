// BaseVisitor constructors are accessed via a parser instance.
import { tokenMatcher } from 'chevrotain'
import { CelParser } from './parser'
import { GreaterThan, LessThan } from 'tokens'

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

export class CelVisitor extends BaseCelVisitor {
  constructor() {
    super()
    this.validateVisitor()
  }

  celExpression(ctx) {
    return this.visit(ctx.comparisonExpression)
  }

  comparisonExpression(ctx): boolean {
    let left = this.visit(ctx.lhs)
    let right = this.visit(ctx.rhs)

    let operator = this.visit(ctx.comparisonOperator)

    if (tokenMatcher(operator, GreaterThan)) {
      return left > right
    } else {
      return left < right
    }
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
      return GreaterThan
    } else {
      return LessThan
    }
  }
}
