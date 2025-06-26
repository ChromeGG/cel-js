import { CelParser } from './parser.js'

import {
  AdditionCstChildren,
  AtomicExpressionCstChildren,
  PrimaryExpressionCstChildren,
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
  size,
  bytes,
  timestamp,
  duration,
  Duration,
} from './helper.js'
import { CelEvaluationError } from './index.js'
import { reservedIdentifiers } from './tokens.js'

/** Mode in which visitors are executed */
enum Mode {
  /** The visitor is executed without any specified mode  */
  'normal',
  /** The visitor is executed inside a has macro */
  'has',
}

const parserInstance = new CelParser()

const BaseCelVisitor = parserInstance.getBaseCstVisitorConstructor()

const defaultFunctions = {
  has,
  size,
  bytes,
  timestamp,
  duration,
}

export class CelVisitor
  extends BaseCelVisitor
  implements ICstNodeVisitor<void, unknown>
{
  constructor(
    context?: Record<string, unknown>,
    functions?: Record<string, CallableFunction>,
  ) {
    super()
    this.context = context || {}

    this.functions = {
      ...defaultFunctions,
      ...(functions || {}),
    }

    this.validateVisitor()
  }

  private context: Record<string, unknown>

  /**
   * Tracks the current mode of the visitor to handle special cases.
   */
  private mode: Mode = Mode.normal

  private functions: Record<string, CallableFunction>

  /**
   * Evaluates the expression including conditional ternary expressions in the form: condition ? trueExpr : falseExpr
   *
   * @param ctx - The expression context containing the condition and optional ternary branches
   * @returns The result of evaluating the expression
   */
  public expr(ctx: ExprCstChildren): unknown {
    const condition = this.visit(ctx.conditionalOr[0])

    // If no ternary operator is present, just return the condition
    if (!ctx.QuestionMark) return condition

    // Evaluate the appropriate branch based on the condition (logical true/false)
    if (condition) {
      return this.visit(ctx.lhs![0])
    } else {
      return this.visit(ctx.rhs![0])
    }
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
  private handleGenericMacro(
    fn: CallableFunction,
    ctx: MacrosExpressionCstChildren,
  ): unknown {
    return fn(
      ...[
        ...(ctx.arg ? [this.visit(ctx.arg)] : []),
        ...(ctx.args ? ctx.args.map((arg) => this.visit(arg)) : []),
      ],
    )
  }

  conditionalOr(ctx: ConditionalOrCstChildren): boolean {
    let left = this.visit(ctx.lhs)

    // Short circuit if left is true. Required for proper logical OR evaluation.
    if (left === true) {
      return true
    }

    if (ctx.rhs) {
      ctx.rhs.forEach((rhsOperand) => {
        // Short circuit - if we already have true, don't evaluate further
        if (left === true) {
          return
        }
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
        // Short circuit - if we already have false, don't evaluate further
        if (left === false) {
          return
        }
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

      // maybe we can make the function more type safe by mapping input w/ output types
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
      if (!ctx.identifierDotExpression && !ctx.Index) {
        return []
      }
      return this.getIndexSection(ctx, [])
    }

    const left = this.visit(ctx.lhs)

    result.push(left)
    if (ctx.rhs) {
      for (const rhsOperand of ctx.rhs) {
        const right = this.visit(rhsOperand)
        result.push(right)
      }
    }

    if (!ctx.identifierDotExpression && !ctx.Index) {
      return result
    }

    return this.getIndexSection(ctx, result)
  }

  mapExpression(ctx: MapExpressionCstChildren) {
    const mapExpression: Record<string, unknown> = {}
    if (!ctx.keyValues) {
      if (!ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
        return {}
      }
      return this.getIndexSection(ctx, {})
    }
    let valueType = ''
    for (const keyValuePair of ctx.keyValues) {
      const [key, value] = this.visit(keyValuePair)
      if (getCelType(key) != CelType.string) {
        throw new CelEvaluationError(`invalid_argument: ${key}`)
      }
      // CEL maps can contain heterogeneous values, so don't enforce type uniformity
      mapExpression[key] = value
    }

    if (!ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
      return mapExpression
    }

    return this.getIndexSection(ctx, mapExpression)
  }

  private getIndexSection(
    ctx: MapExpressionCstChildren | IdentifierExpressionCstChildren | ListExpressionCstChildren,
    mapExpression: unknown,
  ) {
    const expressions = [
      ...(ctx.identifierDotExpression || []),
      ...('identifierIndexExpression' in ctx ? ctx.identifierIndexExpression || [] : []),
      ...('Index' in ctx ? ctx.Index || [] : []),
    ].sort((a, b) => (getPosition(a) > getPosition(b) ? 1 : -1))

    return expressions.reduce((acc: unknown, expression) => {
      if (expression.name === 'identifierDotExpression') {
        const identifierName = expression.children.Identifier[0].image
        
        // Check if this is a method call
        if (expression.children.OpenParenthesis) {
          return this.handleMethodCall(identifierName, expression.children, acc)
        }
        
        return this.getIdentifier(acc, identifierName)
      }

      // Handle index expressions (both identifierIndexExpression and Index)
      const index = this.visit(expression.children.expr[0])
      
      // Handle array indexing
      if (Array.isArray(acc)) {
        const indexType = getCelType(index)
        if (indexType != CelType.int && indexType != CelType.uint) {
          throw new CelEvaluationError(`invalid_argument: ${index}`)
        }

        if (index < 0 || index >= acc.length) {
          throw new CelEvaluationError(`Index out of bounds: ${index}`)
        }

        return acc[index]
      }
      
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
    const [macrosIdentifier] = ctx.Identifier
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
  primaryExpression(ctx: PrimaryExpressionCstChildren) {
    if (ctx.Null) {
      return null
    }

    if (ctx.parenthesisExpression) {
      return this.visit(ctx.parenthesisExpression)
    }

    if (ctx.ByteStringLiteral) {
      // For byte strings, remove the 'b' prefix and quotes, then convert to Uint8Array
      const byteString = ctx.ByteStringLiteral[0].image
      const content = byteString.slice(2, -1) // Remove 'b"' and closing quote
      return this.processByteString(content)
    }

    if (ctx.TripleQuoteStringLiteral) {
      // For triple-quote strings, remove the triple quotes and process escape sequences
      const tripleQuoteString = ctx.TripleQuoteStringLiteral[0].image
      const content = tripleQuoteString.slice(3, -3) // Remove ''' or """
      // Process escape sequences like regular strings
      return content.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\\\/g, '\\').replace(/\\"/g, '"').replace(/\\'/g, "'")
    }

    if (ctx.RawStringLiteral) {
      // For raw strings, remove the 'r' prefix and the quotes, but preserve all content as-is
      const rawString = ctx.RawStringLiteral[0].image
      return rawString.slice(2, -1) // Remove 'r"' and closing quote
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
      return parseInt(ctx.Integer[0].image, 10)
    }

    if (ctx.UnsignedInteger) {
      return parseInt(ctx.UnsignedInteger[0].image.slice(0, -1), 10)
    }

    if (ctx.HexInteger) {
      return parseInt(ctx.HexInteger[0].image.slice(2), 16)
    }

    if (ctx.HexUnsignedInteger) {
      return parseInt(ctx.HexUnsignedInteger[0].image.slice(2, -1), 16)
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

    throw new Error('Primary expression not recognized')
  }

  atomicExpression(ctx: AtomicExpressionCstChildren) {
    // Check if we are in a has() macro
    if (this.mode === Mode.has) {
      // Allow if we have dot expressions at the atomic level
      if (ctx.identifierDotExpression || ctx.atomicIndexExpression) {
        // This is fine - we have field selections
      } else {
        // Check if the primary expression contains an identifier with field selections
        const primaryExpr = ctx.primaryExpression[0]
        if (primaryExpr.children.identifierExpression) {
          const identifierExpr = primaryExpr.children.identifierExpression[0]
          if (!identifierExpr.children.identifierDotExpression && !identifierExpr.children.identifierIndexExpression) {
            throw new CelEvaluationError('has() requires a field selection')
          }
        } else {
          throw new CelEvaluationError('has() does not support atomic expressions')
        }
      }
    }

    // Start with the primary expression
    let result = this.visit(ctx.primaryExpression)

    // Apply any chained method calls or index operations in order
    const allExpressions = [
      ...(ctx.identifierDotExpression || []).map(expr => ({ type: 'dot', expr })),
      ...(ctx.atomicIndexExpression || []).map(expr => ({ type: 'index', expr }))
    ].sort((a, b) => (getPosition(a.expr) > getPosition(b.expr) ? 1 : -1))

    for (const { type, expr } of allExpressions) {
      if (type === 'dot') {
        result = this.visit(expr, result)
      } else if (type === 'index') {
        // Handle indexing
        const index = this.visit(expr)
        
        // Handle array indexing
        if (Array.isArray(result)) {
          const indexType = getCelType(index)
          if (indexType != CelType.int && indexType != CelType.uint) {
            throw new CelEvaluationError(`invalid_argument: ${index}`)
          }

          if (index < 0 || index >= result.length) {
            throw new CelEvaluationError(`Index out of bounds: ${index}`)
          }

          result = result[index]
        } else {
          result = this.getIdentifier(result, index)
        }
      }
    }

    return result
  }

  identifierExpression(ctx: IdentifierExpressionCstChildren): unknown {
    // Validate that we have a dot expression when in a has() macro
    if (this.mode === Mode.has && !ctx.identifierDotExpression?.length) {
      throw new CelEvaluationError('has() requires a field selection')
    }

    const identifierName = ctx.Identifier[0].image
    // If this is a standalone identifier and is reserved, throw
    if (
      !ctx.identifierDotExpression &&
      !ctx.identifierIndexExpression &&
      reservedIdentifiers.includes(identifierName)
    ) {
      throw new Error('Detected reserved identifier. This is not allowed')
    }
    const data = this.context
    const result = this.getIdentifier(data, identifierName)

    if (!ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
      return result
    }

    return this.getIndexSection(ctx, result)
  }

  identifierDotExpression(
    ctx: IdentifierDotExpressionCstChildren,
    param: unknown,
  ): unknown {
    const identifierName = ctx.Identifier[0].image
    
    // Check if this is a method call
    if (ctx.OpenParenthesis) {
      return this.handleMethodCall(identifierName, ctx, param)
    }
    
    return this.getIdentifier(param, identifierName)
  }

  indexExpression(ctx: IndexExpressionCstChildren): unknown {
    return this.visit(ctx.expr)
  }

  getIdentifier(searchContext: unknown, identifier: string): unknown {
    if (typeof searchContext !== 'object' || searchContext === null) {
      throw new Error(
        `Cannot obtain "${identifier}" from non-object context: ${searchContext}`,
      )
    }

    const value = (searchContext as Record<string, unknown>)[identifier]

    if (value === undefined) {
      const context = JSON.stringify(this?.context)

      if (context === '{}') {
        throw new Error(
          `Identifier "${identifier}" not found, no context passed`,
        )
      }
      throw new Error(
        `Identifier "${identifier}" not found in context: ${context}`,
      )
    }

    return value
  }

  /**
   * Handles method calls on collections like .all(x, p)
   */
  private handleMethodCall(
    methodName: string,
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): unknown {
    // Handle timestamp methods
    if (collection instanceof Date) {
      return this.handleTimestampMethod(methodName, collection)
    }

    // Handle duration methods  
    if (typeof collection === 'object' && collection !== null && 'seconds' in collection && 'nanoseconds' in collection) {
      return this.handleDurationMethod(methodName, collection as Duration)
    }

    switch (methodName) {
      case 'all':
        return this.handleAllMethod(ctx, collection)
      case 'exists':
        return this.handleExistsMethod(ctx, collection)
      case 'exists_one':
        return this.handleExistsOneMethod(ctx, collection)
      case 'filter':
        return this.handleFilterMethod(ctx, collection)
      case 'map':
        return this.handleMapMethod(ctx, collection)
      case 'size':
        return this.handleSizeMethod(ctx, collection)
      default:
        throw new CelEvaluationError(`Unknown method: ${methodName}`)
    }
  }

  /**
   * Handles the .all(x, p) method call
   */
  private handleAllMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): boolean {
    // Validate collection type
    if (!Array.isArray(collection) && (typeof collection !== 'object' || collection === null)) {
      throw new CelEvaluationError('all() can only be called on lists or maps')
    }

    // Validate arguments - need exactly 2 arguments: variable and predicate
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('all() requires exactly two arguments: variable and predicate')
    }

    const variableExpr = ctx.arg
    const predicateExpr = ctx.args[0]

    // Handle arrays
    if (Array.isArray(collection)) {
      if (collection.length === 0) {
        return true // Empty arrays return true (vacuous truth)
      }
      return this.evaluateAllForArray(collection, variableExpr, predicateExpr)
    }

    // Handle maps (objects)
    if (typeof collection === 'object') {
      const values = Object.values(collection)
      if (values.length === 0) {
        return true // Empty objects return true (vacuous truth)
      }
      return this.evaluateAllForArray(values, variableExpr, predicateExpr)
    }

    return true
  }

  /**
   * Evaluates the all() predicate for each element in an array
   */
  private evaluateAllForArray(
    array: unknown[],
    variableExpr: any,
    predicateExpr: any,
  ): boolean {
    // Empty arrays return true (vacuous truth)
    if (array.length === 0) {
      return true
    }

    // Extract variable name from the first argument
    let variableName: string
    
    // Navigate through the CST structure to find the identifier
    function extractIdentifier(node: any): string | null {
      if (node.children) {
        if (node.children.Identifier) {
          return node.children.Identifier[0].image
        }
        // Recursively search for identifier in nested structures
        for (const key of Object.keys(node.children)) {
          const child = node.children[key]
          if (Array.isArray(child)) {
            for (const item of child) {
              const result = extractIdentifier(item)
              if (result) return result
            }
          } else {
            const result = extractIdentifier(child)
            if (result) return result
          }
        }
      }
      return null
    }
    
    // Handle the case where variableExpr is an array
    let nodeToSearch = variableExpr
    if (Array.isArray(variableExpr) && variableExpr.length > 0) {
      nodeToSearch = variableExpr[0]
    }
    
    const extractedName = extractIdentifier(nodeToSearch)
    if (extractedName) {
      variableName = extractedName
    } else {
      throw new CelEvaluationError('First argument to all() must be a variable identifier')
    }

    // Evaluate predicate for each element
    for (const element of array) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = element

      try {
        const result = this.visit(predicateExpr)
        if (!result) {
          return false
        }
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return true
  }

  /**
   * Handles the .exists(x, p) method call
   */
  private handleExistsMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): boolean {
    // Validate collection type
    if (!Array.isArray(collection) && (typeof collection !== 'object' || collection === null)) {
      throw new CelEvaluationError('exists() can only be called on lists or maps')
    }

    // Validate arguments - need exactly 2 arguments: variable and predicate
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('exists() requires exactly two arguments: variable and predicate')
    }

    const variableExpr = ctx.arg
    const predicateExpr = ctx.args[0]

    // Handle arrays
    if (Array.isArray(collection)) {
      if (collection.length === 0) {
        return false // Empty arrays return false (no elements to satisfy condition)
      }
      return this.evaluateExistsForArray(collection, variableExpr, predicateExpr)
    }

    // Handle maps (objects)
    if (typeof collection === 'object') {
      const values = Object.values(collection)
      if (values.length === 0) {
        return false // Empty objects return false (no elements to satisfy condition)
      }
      return this.evaluateExistsForArray(values, variableExpr, predicateExpr)
    }

    return false
  }

  /**
   * Evaluates the exists() predicate for each element in an array
   */
  private evaluateExistsForArray(
    array: unknown[],
    variableExpr: any,
    predicateExpr: any,
  ): boolean {
    // Empty arrays return false
    if (array.length === 0) {
      return false
    }

    // Extract variable name from the first argument
    let variableName: string
    
    // Navigate through the CST structure to find the identifier
    function extractIdentifier(node: any): string | null {
      if (node.children) {
        if (node.children.Identifier) {
          return node.children.Identifier[0].image
        }
        // Recursively search for identifier in nested structures
        for (const key of Object.keys(node.children)) {
          const child = node.children[key]
          if (Array.isArray(child)) {
            for (const item of child) {
              const result = extractIdentifier(item)
              if (result) return result
            }
          } else {
            const result = extractIdentifier(child)
            if (result) return result
          }
        }
      }
      return null
    }
    
    // Handle the case where variableExpr is an array
    let nodeToSearch = variableExpr
    if (Array.isArray(variableExpr) && variableExpr.length > 0) {
      nodeToSearch = variableExpr[0]
    }
    
    const extractedName = extractIdentifier(nodeToSearch)
    if (extractedName) {
      variableName = extractedName
    } else {
      throw new CelEvaluationError('First argument to exists() must be a variable identifier')
    }

    // Evaluate predicate for each element - short-circuit on first match
    for (const element of array) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = element

      try {
        const result = this.visit(predicateExpr)
        if (result) {
          return true // Short-circuit: return true as soon as one element satisfies the condition
        }
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return false // No element satisfied the condition
  }

  /**
   * Handles the .exists_one(x, p) method call
   */
  private handleExistsOneMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): boolean {
    // Validate collection type
    if (!Array.isArray(collection) && (typeof collection !== 'object' || collection === null)) {
      throw new CelEvaluationError('exists_one() can only be called on lists or maps')
    }

    // Validate arguments - need exactly 2 arguments: variable and predicate
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('exists_one() requires exactly two arguments: variable and predicate')
    }

    const variableExpr = ctx.arg
    const predicateExpr = ctx.args[0]

    // Handle arrays
    if (Array.isArray(collection)) {
      if (collection.length === 0) {
        return false // Empty arrays return false (no elements to satisfy condition)
      }
      return this.evaluateExistsOneForArray(collection, variableExpr, predicateExpr)
    }

    // Handle maps (objects)
    if (typeof collection === 'object') {
      const values = Object.values(collection)
      if (values.length === 0) {
        return false // Empty objects return false (no elements to satisfy condition)
      }
      return this.evaluateExistsOneForArray(values, variableExpr, predicateExpr)
    }

    return false
  }

  /**
   * Evaluates the exists_one() predicate for each element in an array
   */
  private evaluateExistsOneForArray(
    array: unknown[],
    variableExpr: any,
    predicateExpr: any,
  ): boolean {
    // Empty arrays return false
    if (array.length === 0) {
      return false
    }

    // Extract variable name from the first argument
    let variableName: string
    
    // Navigate through the CST structure to find the identifier
    function extractIdentifier(node: any): string | null {
      if (node.children) {
        if (node.children.Identifier) {
          return node.children.Identifier[0].image
        }
        // Recursively search for identifier in nested structures
        for (const key of Object.keys(node.children)) {
          const child = node.children[key]
          if (Array.isArray(child)) {
            for (const item of child) {
              const result = extractIdentifier(item)
              if (result) return result
            }
          } else {
            const result = extractIdentifier(child)
            if (result) return result
          }
        }
      }
      return null
    }
    
    // Handle the case where variableExpr is an array
    let nodeToSearch = variableExpr
    if (Array.isArray(variableExpr) && variableExpr.length > 0) {
      nodeToSearch = variableExpr[0]
    }
    
    const extractedName = extractIdentifier(nodeToSearch)
    if (extractedName) {
      variableName = extractedName
    } else {
      throw new CelEvaluationError('First argument to exists_one() must be a variable identifier')
    }

    // Count how many elements satisfy the condition
    let matchCount = 0
    
    for (const element of array) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = element

      try {
        const result = this.visit(predicateExpr)
        if (result) {
          matchCount++
          // Early exit if we already have more than one match
          if (matchCount > 1) {
            return false
          }
        }
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return matchCount === 1 // Return true only if exactly one element satisfied the condition
  }

  /**
   * Handles the .filter(x, p) method call
   */
  private handleFilterMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): unknown {
    // Validate collection type
    if (!Array.isArray(collection) && (typeof collection !== 'object' || collection === null)) {
      throw new CelEvaluationError('filter() can only be called on lists or maps')
    }

    // Validate arguments - need exactly 2 arguments: variable and predicate
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('filter() requires exactly two arguments: variable and predicate')
    }

    const variableExpr = ctx.arg
    const predicateExpr = ctx.args[0]

    // Handle arrays
    if (Array.isArray(collection)) {
      return this.filterArray(collection, variableExpr, predicateExpr)
    }

    // Handle maps (objects)
    if (typeof collection === 'object') {
      return this.filterMap(collection as Record<string, unknown>, variableExpr, predicateExpr)
    }

    return collection
  }

  /**
   * Filters an array based on the predicate
   */
  private filterArray(
    array: unknown[],
    variableExpr: any,
    predicateExpr: any,
  ): unknown[] {
    // Empty arrays return empty array
    if (array.length === 0) {
      return []
    }

    // Extract variable name from the first argument
    let variableName: string
    
    // Navigate through the CST structure to find the identifier
    function extractIdentifier(node: any): string | null {
      if (node.children) {
        if (node.children.Identifier) {
          return node.children.Identifier[0].image
        }
        // Recursively search for identifier in nested structures
        for (const key of Object.keys(node.children)) {
          const child = node.children[key]
          if (Array.isArray(child)) {
            for (const item of child) {
              const result = extractIdentifier(item)
              if (result) return result
            }
          } else {
            const result = extractIdentifier(child)
            if (result) return result
          }
        }
      }
      return null
    }
    
    // Handle the case where variableExpr is an array
    let nodeToSearch = variableExpr
    if (Array.isArray(variableExpr) && variableExpr.length > 0) {
      nodeToSearch = variableExpr[0]
    }
    
    const extractedName = extractIdentifier(nodeToSearch)
    if (extractedName) {
      variableName = extractedName
    } else {
      throw new CelEvaluationError('First argument to filter() must be a variable identifier')
    }

    // Filter elements based on predicate
    const filteredArray: unknown[] = []
    
    for (const element of array) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = element

      try {
        const result = this.visit(predicateExpr)
        if (result) {
          filteredArray.push(element)
        }
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return filteredArray
  }

  /**
   * Filters a map based on the predicate applied to values
   */
  private filterMap(
    map: Record<string, unknown>,
    variableExpr: any,
    predicateExpr: any,
  ): Record<string, unknown> {
    // Extract variable name from the first argument
    let variableName: string
    
    // Navigate through the CST structure to find the identifier
    function extractIdentifier(node: any): string | null {
      if (node.children) {
        if (node.children.Identifier) {
          return node.children.Identifier[0].image
        }
        // Recursively search for identifier in nested structures
        for (const key of Object.keys(node.children)) {
          const child = node.children[key]
          if (Array.isArray(child)) {
            for (const item of child) {
              const result = extractIdentifier(item)
              if (result) return result
            }
          } else {
            const result = extractIdentifier(child)
            if (result) return result
          }
        }
      }
      return null
    }
    
    // Handle the case where variableExpr is an array
    let nodeToSearch = variableExpr
    if (Array.isArray(variableExpr) && variableExpr.length > 0) {
      nodeToSearch = variableExpr[0]
    }
    
    const extractedName = extractIdentifier(nodeToSearch)
    if (extractedName) {
      variableName = extractedName
    } else {
      throw new CelEvaluationError('First argument to filter() must be a variable identifier')
    }

    // Filter map entries based on predicate applied to values
    const filteredMap: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(map)) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = value

      try {
        const result = this.visit(predicateExpr)
        if (result) {
          filteredMap[key] = value
        }
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return filteredMap
  }

  /**
   * Handles the .map(x, t) or .map(x, p, t) method call
   */
  private handleMapMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): unknown {
    // Validate collection type
    if (!Array.isArray(collection) && (typeof collection !== 'object' || collection === null)) {
      throw new CelEvaluationError('map() can only be called on lists or maps')
    }

    // Validate arguments - need either 2 arguments (variable, transform) or 3 arguments (variable, predicate, transform)
    if (!ctx.arg || !ctx.args || (ctx.args.length !== 1 && ctx.args.length !== 2)) {
      throw new CelEvaluationError('map() requires either two arguments (variable, transform) or three arguments (variable, predicate, transform)')
    }

    const variableExpr = ctx.arg
    const isThreeArguments = ctx.args.length === 2
    
    if (isThreeArguments) {
      // Three arguments: variable, predicate, transform
      const predicateExpr = ctx.args[0]
      const transformExpr = ctx.args[1]
      
      // Handle arrays
      if (Array.isArray(collection)) {
        return this.mapArrayWithFilter(collection, variableExpr, predicateExpr, transformExpr)
      }

      // Handle maps (objects)
      if (typeof collection === 'object') {
        return this.mapMapWithFilter(collection as Record<string, unknown>, variableExpr, predicateExpr, transformExpr)
      }
    } else {
      // Two arguments: variable, transform
      const transformExpr = ctx.args[0]
      
      // Handle arrays
      if (Array.isArray(collection)) {
        return this.mapArray(collection, variableExpr, transformExpr)
      }

      // Handle maps (objects)
      if (typeof collection === 'object') {
        return this.mapMap(collection as Record<string, unknown>, variableExpr, transformExpr)
      }
    }

    return collection
  }

  /**
   * Maps an array by transforming each element
   */
  private mapArray(
    array: unknown[],
    variableExpr: any,
    transformExpr: any,
  ): unknown[] {
    // Empty arrays return empty array
    if (array.length === 0) {
      return []
    }

    const variableName = this.extractVariableName(variableExpr, 'map()')
    const mappedArray: unknown[] = []
    
    for (const element of array) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = element

      try {
        const transformedValue = this.visit(transformExpr)
        mappedArray.push(transformedValue)
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return mappedArray
  }

  /**
   * Maps a map by transforming each value
   */
  private mapMap(
    map: Record<string, unknown>,
    variableExpr: any,
    transformExpr: any,
  ): Record<string, unknown> {
    const variableName = this.extractVariableName(variableExpr, 'map()')
    const mappedMap: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(map)) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = value

      try {
        const transformedValue = this.visit(transformExpr)
        mappedMap[key] = transformedValue
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return mappedMap
  }

  /**
   * Maps an array by filtering then transforming elements
   */
  private mapArrayWithFilter(
    array: unknown[],
    variableExpr: any,
    predicateExpr: any,
    transformExpr: any,
  ): unknown[] {
    // Empty arrays return empty array
    if (array.length === 0) {
      return []
    }

    const variableName = this.extractVariableName(variableExpr, 'map()')
    const mappedArray: unknown[] = []
    
    for (const element of array) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = element

      try {
        // First evaluate the predicate
        const predicateResult = this.visit(predicateExpr)
        if (predicateResult) {
          // If predicate is true, transform the element
          const transformedValue = this.visit(transformExpr)
          mappedArray.push(transformedValue)
        }
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return mappedArray
  }

  /**
   * Maps a map by filtering then transforming values
   */
  private mapMapWithFilter(
    map: Record<string, unknown>,
    variableExpr: any,
    predicateExpr: any,
    transformExpr: any,
  ): Record<string, unknown> {
    const variableName = this.extractVariableName(variableExpr, 'map()')
    const mappedMap: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(map)) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = value

      try {
        // First evaluate the predicate
        const predicateResult = this.visit(predicateExpr)
        if (predicateResult) {
          // If predicate is true, transform the value
          const transformedValue = this.visit(transformExpr)
          mappedMap[key] = transformedValue
        }
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return mappedMap
  }

  /**
   * Extracts variable name from expression - helper method to reduce code duplication
   */
  private extractVariableName(variableExpr: any, methodName: string): string {
    // Navigate through the CST structure to find the identifier
    function extractIdentifier(node: any): string | null {
      if (node.children) {
        if (node.children.Identifier) {
          return node.children.Identifier[0].image
        }
        // Recursively search for identifier in nested structures
        for (const key of Object.keys(node.children)) {
          const child = node.children[key]
          if (Array.isArray(child)) {
            for (const item of child) {
              const result = extractIdentifier(item)
              if (result) return result
            }
          } else {
            const result = extractIdentifier(child)
            if (result) return result
          }
        }
      }
      return null
    }
    
    // Handle the case where variableExpr is an array
    let nodeToSearch = variableExpr
    if (Array.isArray(variableExpr) && variableExpr.length > 0) {
      nodeToSearch = variableExpr[0]
    }
    
    const extractedName = extractIdentifier(nodeToSearch)
    if (extractedName) {
      return extractedName
    } else {
      throw new CelEvaluationError(`First argument to ${methodName} must be a variable identifier`)
    }
  }

  /**
   * Handles the .size() method call
   */
  private handleSizeMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): number {
    // Validate arguments - size() takes no arguments when called as method
    if (ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('size() method takes no arguments')
    }

    // Use the existing size macro logic
    if (Array.isArray(collection)) {
      return collection.length
    }

    if (typeof collection === 'string') {
      return collection.length
    }

    if (typeof collection === 'object' && collection !== null) {
      if (collection instanceof Uint8Array) {
        return collection.length
      }
      return Object.keys(collection).length
    }

    throw new CelEvaluationError('size() can only be called on strings, lists, maps, or bytes')
  }

  /**
   * Processes a byte string content and converts it to a Uint8Array.
   * Handles escape sequences including hex (\x41), octal (\101), and common escapes.
   */
  private processByteString(content: string): Uint8Array {
    const bytes: number[] = []
    let i = 0
    
    while (i < content.length) {
      if (content[i] === '\\' && i + 1 < content.length) {
        const nextChar = content[i + 1]
        
        if (nextChar === 'x' && i + 3 <= content.length) {
          // Hex escape sequence \x41
          const hexDigits = content.slice(i + 2, i + 4)
          if (/^[0-9a-fA-F]{2}$/.test(hexDigits)) {
            bytes.push(parseInt(hexDigits, 16))
            i += 4
            continue
          }
        } else if (/^[0-7]/.test(nextChar)) {
          // Octal escape sequence \101 (up to 3 digits)
          let octalDigits = ''
          let j = i + 1
          while (j < content.length && j < i + 4 && /^[0-7]$/.test(content[j])) {
            octalDigits += content[j]
            j++
          }
          if (octalDigits.length > 0) {
            bytes.push(parseInt(octalDigits, 8))
            i = j
            continue
          }
        } else {
          // Common escape sequences
          switch (nextChar) {
            case 'n':
              bytes.push(10) // \n
              i += 2
              continue
            case 't':
              bytes.push(9) // \t
              i += 2
              continue
            case 'r':
              bytes.push(13) // \r
              i += 2
              continue
            case '\\':
              bytes.push(92) // \\
              i += 2
              continue
            case '"':
              bytes.push(34) // \"
              i += 2
              continue
            case "'":
              bytes.push(39) // \'
              i += 2
              continue
            default:
              // Unknown escape, treat as literal
              bytes.push(content.charCodeAt(i))
              i++
              continue
          }
        }
      }
      
      // Regular character
      bytes.push(content.charCodeAt(i))
      i++
    }
    
    return new Uint8Array(bytes)
  }

  /**
   * Handles method calls on timestamp objects
   */
  private handleTimestampMethod(methodName: string, timestamp: Date): unknown {
    switch (methodName) {
      case 'getFullYear':
        return timestamp.getUTCFullYear()
      case 'getMonth':
        return timestamp.getUTCMonth()
      case 'getDate':
        return timestamp.getUTCDate()
      case 'getHours':
        return timestamp.getUTCHours()
      case 'getMinutes':
        return timestamp.getUTCMinutes()
      case 'getSeconds':
        return timestamp.getUTCSeconds()
      case 'getDay':
        return timestamp.getUTCDay()
      case 'getTime':
        return timestamp.getTime()
      default:
        throw new CelEvaluationError(`Unknown timestamp method: ${methodName}`)
    }
  }

  /**
   * Handles method calls on duration objects
   */
  private handleDurationMethod(methodName: string, duration: Duration): unknown {
    switch (methodName) {
      case 'getSeconds':
        return duration.seconds
      case 'getMilliseconds':
        return duration.seconds * 1000 + duration.nanoseconds / 1000000
      case 'getNanoseconds':
        return duration.seconds * 1e9 + duration.nanoseconds
      default:
        throw new CelEvaluationError(`Unknown duration method: ${methodName}`)
    }
  }
}
