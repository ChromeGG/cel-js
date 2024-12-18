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

import {
  CelType,
  getCelType,
  getPosition,
  getResult,
  getUnaryResult,
  has,
  size
} from './helper.js'
import { CelEvaluationError } from './index.js'

/** Mode in which visitors are executed */
enum Mode {
  /** The visitor is executed without any specified mode  */
  'normal',
  /** The visitor is executed inside a has macro */
  'has'
}

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

const defaultFunctions = {
  has,
  size
};

export class CelVisitor
  extends BaseCelVisitor
  implements ICstNodeVisitor<void, unknown>
{
  constructor(context?: Record<string, unknown>, functions?: Record<string, CallableFunction>) {
    super()
    this.context = context || {};

    this.functions = {
      ...defaultFunctions,
      ...(functions || {}),
    };

    this.validateVisitor();
  }

  private context: Record<string, unknown>

  /**
   * Tracks the current mode of the visitor to handle special cases.
   */
  private mode: Mode = Mode.normal

  private functions: Record<string, CallableFunction>

  public expr(ctx: ExprCstChildren) {
    return this.visit(ctx.conditionalOr) as unknown
  }

  /**
   * Handles the special 'has' macro which checks for the existence of a field.
   * 
   * @param ctx - The macro expression context containing the argument to check
   * @returns boolean indicating if the field exists
   * @throws CelEvaluationError if argument is missing or invalid
   */
  private handleHasMacro(ctx: MacrosExpressionCstChildren): boolean {
    if (!ctx.arg) {
      throw new CelEvaluationError('has() requires exactly one argument')
    }

    this.mode = Mode.has
    try {
      const result = this.visit(ctx.arg)
      return this.functions.has(result)
    } catch (error) {
      // Only convert to false if it's not a validation error
      if (error instanceof CelEvaluationError) {
        throw error
      }
      return false
    } finally {
      this.mode = Mode.normal
    }
  }

  /**
   * Handles execution of generic macro functions by evaluating and passing their arguments.
   * 
   * @param fn - The macro function to execute
   * @param ctx - The macro expression context containing the arguments
   * @returns The result of executing the macro function with the evaluated arguments
   */
  private handleGenericMacro(fn: CallableFunction, ctx: MacrosExpressionCstChildren): unknown {
    return fn(...[
      ...(ctx.arg ? [this.visit(ctx.arg)] : []),
      ...(ctx.args ? ctx.args.map((arg) => this.visit(arg)) : [])
    ])
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

  /**
   * Evaluates a logical AND expression by visiting left and right hand operands.
   * 
   * @param ctx - The conditional AND context containing left and right operands
   * @returns The boolean result of evaluating the AND expression
   * 
   * This method implements short-circuit evaluation - if the left operand is false,
   * it returns false immediately without evaluating the right operand. This is required
   * for proper handling of the has() macro.
   * 
   * For multiple right-hand operands, it evaluates them sequentially, combining results
   * with logical AND operations.
   */
  conditionalAnd(ctx: ConditionalAndCstChildren): boolean {
    let left = this.visit(ctx.lhs)

    // Short circuit if left is false. Required to quick fail for has() macro.
    if (left === false) {
      return false
    }
    
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

    if (!ctx.Index) {
      return result
    }

    const index = this.visit(ctx.Index)

    const indexType = getCelType(index)
    if (indexType != CelType.int && indexType != CelType.uint) {
      throw new CelEvaluationError(`invalid_argument: ${index}`)
    }

    if (index < 0 || index >= result.length) {
      throw new CelEvaluationError(`Index out of bounds: ${index}`)
    }

    return result[index]
  }

  mapExpression(ctx: MapExpressionCstChildren) {
    const mapExpression: Record<string, unknown> = {}
    if (!ctx.keyValues) {
      return {}
    }
    let valueType = ''
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

    if (!ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
      return mapExpression
    }

    return this.getIndexSection(ctx, mapExpression)
  }

  private getIndexSection(
    ctx: MapExpressionCstChildren | IdentifierExpressionCstChildren,
    mapExpression: unknown
  ) {
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

  /**
   * Evaluates a macros expression by executing the corresponding macro function.
   * 
   * @param ctx - The macro expression context containing the macro identifier and arguments
   * @returns The result of executing the macro function
   * @throws Error if the macro function is not recognized
   * 
   * This method handles two types of macros:
   * 1. The special 'has' macro which checks for field existence
   * 2. Generic macros that take evaluated arguments
   */
  macrosExpression(ctx: MacrosExpressionCstChildren): unknown {
    const [ macrosIdentifier ] = ctx.Identifier
    const fn = this.functions[macrosIdentifier.image]
    
    if (!fn) {
      throw new Error(`Macros ${macrosIdentifier.image} not recognized`)
    }

    // Handle special case for `has` macro
    if (macrosIdentifier.image === 'has') {
      return this.handleHasMacro(ctx)
    }
    
    return this.handleGenericMacro(fn, ctx)
  }

  /**
   * Evaluates an atomic expression node in the AST.
   * 
   * @param ctx - The atomic expression context containing the expression type and value
   * @returns The evaluated value of the atomic expression
   * @throws CelEvaluationError if invalid atomic expression is used in has() macro
   * @throws Error if reserved identifier is used or expression type not recognized
   *
   * Handles the following atomic expression types:
   * - Null literals
   * - Parenthesized expressions 
   * - String literals
   * - Boolean literals
   * - Float literals
   * - Integer literals
   * - Identifier expressions
   * - List expressions
   * - Map expressions
   * - Macro expressions
   */
  atomicExpression(ctx: AtomicExpressionCstChildren) {
    if (ctx.Null) {
      return null
    }

    // Check if we are in a has() macro, and if so, throw an error if we are not in a field selection
    if (this.mode === Mode.has && !ctx.identifierExpression) {
      throw new CelEvaluationError('has() does not support atomic expressions')
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
    // Validate that we have a dot expression when in a has() macro
    if (this.mode === Mode.has && !ctx.identifierDotExpression?.length) {  
      throw new CelEvaluationError('has() requires a field selection')
    }
    
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

  indexExpression(ctx: IndexExpressionCstChildren): unknown {
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
