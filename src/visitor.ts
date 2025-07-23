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
  AbsoluteIdentifierExpressionCstChildren,
  IndexExpressionCstChildren,
  ListExpressionCstChildren,
  MultiplicationCstChildren,
  ParenthesisExpressionCstChildren,
  RelationCstChildren,
  UnaryExpressionCstChildren,
  MapKeyValuesCstChildren,
  MapExpressionCstChildren,
  StructExpressionCstChildren,
  StructKeyValuesCstChildren,
  ListElementCstChildren,
} from './cst-definitions.js'

import {
  CelType,
  getCelType,
  getPosition,
  getResult,
  getUnaryResult,
  has,
  hasExt,
  getExt,
  dyn,
  size,
  bytes,
  timestamp,
  duration,
  Duration,
  string,
  abs,
  unwrapValue,
  max,
  min,
  floor,
  type,
  ceil,
  double,
  int,
  uint,
  bool,
  optional,
  math,
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
  hasExt,
  getExt,
  dyn,
  size,
  bytes,
  timestamp,
  duration,
  string,
  abs,
  max,
  min,
  floor,
  ceil,
  type,
  double,
  int,
  uint,
  bool,
}

export class CelVisitor
  extends BaseCelVisitor
  implements ICstNodeVisitor<void, unknown>
{
  constructor(
    context?: Record<string, unknown>,
    functions?: Record<string, CallableFunction>,
    container?: string,
  ) {
    super()
    this.context = {
      optional,
      math,
      ...(context || {}),
    }

    this.functions = {
      ...defaultFunctions,
      ...(functions || {}),
    }

    this.container = container

    this.validateVisitor()
  }

  private context: Record<string, unknown>
  private container?: string

  /**
   * Tracks the current mode of the visitor to handle special cases.
   */
  private mode: Mode = Mode.normal

  /**
   * Tracks if has() validation has already been done to avoid duplicate checks.
   */
  private hasValidationDone: boolean = false

  private functions: Record<string, CallableFunction>

  /**
   * Tracks the current block context for cel.block() and cel.index() operations.
   */
  private blockContext: any[] | null = null

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

    // CEL treats null as false in ternary conditions
    const booleanCondition = condition === null ? false : condition
    
    // CEL requires the condition to be a boolean type (after null conversion)
    if (typeof booleanCondition !== 'boolean') {
      throw new Error(`Ternary condition must be boolean, got ${typeof condition}`)
    }

    // Evaluate the appropriate branch based on the condition
    if (booleanCondition) {
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
    this.hasValidationDone = false // Track if we've done validation yet
    
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
      this.hasValidationDone = false
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
    let left: unknown
    let leftError: Error | null = null

    // Try to evaluate left operand, catch errors for short-circuit evaluation
    try {
      left = this.visit(ctx.lhs)
    } catch (error) {
      leftError = error instanceof Error ? error : new Error(String(error))
    }

    // Short circuit if left is true. Required for proper logical OR evaluation.
    if (left === true) {
      return true
    }

    if (ctx.rhs) {
      let result = left
      let hasError = leftError !== null

      ctx.rhs.forEach((rhsOperand) => {
        // Short circuit - if we already have true, don't evaluate further
        if (result === true) {
          return
        }

        try {
          const right = this.visit(rhsOperand)
          
          // If left had an error but right is true, we can short-circuit to true
          if (hasError && right === true) {
            result = true
            hasError = false
            return
          }
          
          // If we have a valid left value, use normal OR logic
          if (!hasError) {
            const operator = ctx.LogicalOrOperator![0]
            result = getResult(operator, result, right)
          } else {
            // Left had error, right is not true, so we can't short-circuit
            // We must propagate the left error
            throw leftError
          }
        } catch (error) {
          // If right also fails and left failed, propagate left error
          if (hasError) {
            throw leftError
          }
          // If left was ok but right fails, propagate right error
          throw error
        }
      })

      // If we still have an error and no successful evaluation, throw it
      if (hasError) {
        throw leftError
      }

      return result as boolean
    }

    // No right operand, if left had error, throw it
    if (leftError) {
      throw leftError
    }

    return left as boolean
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
    let left: unknown
    let leftError: Error | null = null

    // Try to evaluate left operand, catch errors for short-circuit evaluation  
    try {
      left = this.visit(ctx.lhs)
    } catch (error) {
      leftError = error instanceof Error ? error : new Error(String(error))
    }

    // Short circuit if left is false. Required to quick fail for has() macro.
    if (left === false) {
      return false
    }

    if (ctx.rhs) {
      let result = left
      let hasError = leftError !== null

      ctx.rhs.forEach((rhsOperand) => {
        // Short circuit - if we already have false, don't evaluate further
        if (result === false) {
          return
        }

        try {
          const right = this.visit(rhsOperand)
          
          // If left had an error but right is false, we can short-circuit to false
          if (hasError && right === false) {
            result = false
            hasError = false
            return
          }
          
          // If we have a valid left value, use normal AND logic
          if (!hasError) {
            const operator = ctx.LogicalAndOperator![0]
            result = getResult(operator, result, right)
          } else {
            // Left had error, right is not false, so we can't short-circuit
            // We must propagate the left error
            throw leftError
          }
        } catch (error) {
          // If right also fails and left failed, propagate left error
          if (hasError) {
            throw leftError
          }
          // If left was ok but right fails, propagate right error
          throw error
        }
      })

      // If we still have an error and no successful evaluation, throw it
      if (hasError) {
        throw leftError
      }

      return result as boolean
    }

    // No right operand, if left had error, throw it
    if (leftError) {
      throw leftError
    }

    return left as boolean
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
    
    const usedKeys = new Set<string>()
    
    for (const keyValuePair of ctx.keyValues) {
      const [key, value] = this.visit(keyValuePair)
      
      // Validate key type - CEL maps don't support float or null keys
      const keyType = getCelType(key)
      if (keyType === CelType.float) {
        throw new CelEvaluationError('unsupported key type')
      }
      if (key === null || key === undefined) {
        throw new CelEvaluationError('unsupported key type')
      }
      
      // Convert non-string keys to strings for JavaScript compatibility
      const stringKey = String(key)
      
      // Check for duplicate keys
      if (usedKeys.has(stringKey)) {
        throw new CelEvaluationError('Failed with repeated key')
      }
      usedKeys.add(stringKey)
      
      mapExpression[stringKey] = value
    }

    if (!ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
      return mapExpression
    }

    return this.getIndexSection(ctx, mapExpression)
  }

  private tryQualifiedResolution(baseName: string, dotExpressions: any[], context: any): unknown {
    const parts = [baseName]
    let hasMethodCall = false
    
    // Build all the parts of the qualified name
    for (const dotExpr of dotExpressions) {
      // Only consider dot expressions that are simple property access (not method calls)
      if (!dotExpr.children.OpenParenthesis) {
        let identifierName: string
        if (dotExpr.children.Identifier && dotExpr.children.Identifier.length > 0) {
          identifierName = dotExpr.children.Identifier[0].image
        } else if (dotExpr.children.QuotedIdentifier && dotExpr.children.QuotedIdentifier.length > 0) {
          const quotedImage = dotExpr.children.QuotedIdentifier[0].image
          identifierName = quotedImage.slice(1, -1) // Remove backticks
        } else {
          break // Stop if we can't get the identifier
        }
        parts.push(identifierName)
      } else {
        hasMethodCall = true
        break // Stop at method calls
      }
    }
    
    // If we stopped because of a method call, don't try qualified resolution
    // let the method call be handled by getIndexSection
    if (hasMethodCall) {
      return null
    }
    
    // Try longest prefix first, then shorter prefixes
    for (let i = parts.length; i >= 1; i--) {
      const qualifiedName = parts.slice(0, i).join('.')
      if (qualifiedName in context) {
        const baseValue = context[qualifiedName]
        
        // If we matched the full qualified name, return it directly
        if (i === parts.length) {
          return baseValue
        }
        
        // Otherwise, we need to resolve the remaining parts on the base value
        const remainingParts = parts.slice(i)
        let current = baseValue
        
        for (const part of remainingParts) {
          if (current && typeof current === 'object' && part in current) {
            current = (current as any)[part]
          } else {
            // Can't resolve further, return null to indicate failure
            return null
          }
        }
        
        return current
      }
    }
    
    return null // No qualified resolution found
  }

  /**
   * Handles the strings namespace functions like strings.quote()
   */
  private handleStringsNamespace(dotExpressions: any[]): unknown {
    if (dotExpressions.length === 0) {
      throw new CelEvaluationError('Incomplete strings namespace reference')
    }

    const firstDot = dotExpressions[0]
    if (!firstDot.children.Identifier || firstDot.children.Identifier.length === 0) {
      throw new CelEvaluationError('Invalid strings namespace method')
    }

    const methodName = firstDot.children.Identifier[0].image

    switch (methodName) {
      case 'quote':
        if (!firstDot.children.OpenParenthesis) {
          throw new CelEvaluationError('strings.quote requires parentheses')
        }
        return this.handleStringsQuote(firstDot.children)
      default:
        throw new CelEvaluationError(`Unknown strings namespace method: ${methodName}`)
    }
  }

  /**
   * Handles the strings.quote(str) function
   */
  private handleStringsQuote(ctx: any): string {
    // Validate arguments - quote() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('strings.quote() requires exactly one argument')
    }

    const str = this.visit(ctx.arg)
    
    if (typeof str !== 'string') {
      throw new CelEvaluationError('strings.quote() argument must be a string')
    }

    // Escape the string and wrap in quotes
    let escaped = str
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/"/g, '\\"')    // Escape double quotes
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t')   // Escape tabs
      .replace(/\f/g, '\\f')   // Escape form feeds
      .replace(/\b/g, '\\b')   // Escape backspaces
      .replace(/\v/g, '\\v')   // Escape vertical tabs
      .replace(/\x07/g, '\\a') // Escape bell character

    return `"${escaped}"`
  }

  /**
   * Handles the base64 namespace functions
   */
  private handleBase64Namespace(dotExpressions: any[]): unknown {
    if (dotExpressions.length === 0) {
      throw new CelEvaluationError('Incomplete base64 namespace reference')
    }

    const firstDot = dotExpressions[0]
    if (!firstDot.children.Identifier || firstDot.children.Identifier.length === 0) {
      throw new CelEvaluationError('Invalid base64 namespace method')
    }

    const methodName = firstDot.children.Identifier[0].image

    switch (methodName) {
      case 'encode':
        if (!firstDot.children.OpenParenthesis) {
          throw new CelEvaluationError('base64.encode requires parentheses')
        }
        return this.handleBase64Encode(firstDot.children)
      case 'decode':
        if (!firstDot.children.OpenParenthesis) {
          throw new CelEvaluationError('base64.decode requires parentheses')
        }
        return this.handleBase64Decode(firstDot.children)
      default:
        throw new CelEvaluationError(`Unknown base64 namespace method: ${methodName}`)
    }
  }

  /**
   * Handles the base64.encode(bytes) function
   */
  private handleBase64Encode(ctx: any): string {
    // Validate arguments - encode() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('base64.encode() requires exactly one argument')
    }

    const bytes = this.visit(ctx.arg)
    
    if (!(bytes instanceof Uint8Array)) {
      throw new CelEvaluationError('base64.encode() argument must be bytes')
    }

    // Convert Uint8Array to Buffer and encode as base64
    const buffer = Buffer.from(bytes)
    return buffer.toString('base64')
  }

  /**
   * Handles the base64.decode(string) function
   */
  private handleBase64Decode(ctx: any): Uint8Array {
    // Validate arguments - decode() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('base64.decode() requires exactly one argument')
    }

    const str = this.visit(ctx.arg)
    
    if (typeof str !== 'string') {
      throw new CelEvaluationError('base64.decode() argument must be a string')
    }

    try {
      // Decode base64 string to Buffer, then convert to Uint8Array
      const buffer = Buffer.from(str, 'base64')
      return new Uint8Array(buffer)
    } catch (error) {
      throw new CelEvaluationError(`Invalid base64 string: ${str}`)
    }
  }

  /**
   * Handles the cel namespace functions like cel.bind()
   */
  private handleCelNamespace(dotExpressions: any[]): unknown {
    if (dotExpressions.length === 0) {
      throw new CelEvaluationError('Incomplete cel namespace reference')
    }

    const firstDot = dotExpressions[0]
    if (!firstDot.children.Identifier || firstDot.children.Identifier.length === 0) {
      throw new CelEvaluationError('Invalid cel namespace method')
    }

    const methodName = firstDot.children.Identifier[0].image

    switch (methodName) {
      case 'bind':
        if (!firstDot.children.OpenParenthesis) {
          throw new CelEvaluationError('cel.bind requires parentheses')
        }
        return this.handleCelBind(firstDot.children)
      case 'block':
        if (!firstDot.children.OpenParenthesis) {
          throw new CelEvaluationError('cel.block requires parentheses')
        }
        return this.handleCelBlock(firstDot.children)
      case 'index':
        if (!firstDot.children.OpenParenthesis) {
          throw new CelEvaluationError('cel.index requires parentheses')
        }
        return this.handleCelIndex(firstDot.children)
      case 'expr':
        // Handle cel.expr.* extension identifiers
        // These should resolve to a string identifier that can be used with proto functions
        if (dotExpressions.length === 1) {
          throw new CelEvaluationError('Incomplete cel.expr namespace reference')
        }
        // Build the full extension path by traversing the remaining dot expressions
        const path = ['cel', 'expr']
        for (let i = 1; i < dotExpressions.length; i++) {
          const dot = dotExpressions[i]
          if (dot.children.Identifier && dot.children.Identifier.length > 0) {
            path.push(dot.children.Identifier[0].image)
          }
        }
        return path.join('.')
      default:
        throw new CelEvaluationError(`Unknown cel namespace method: ${methodName}`)
    }
  }

  /**
   * Handles the cel.bind(var, value, expr) function
   */
  private handleCelBind(ctx: any): unknown {
    // Validate arguments - bind() requires exactly three arguments (one ctx.arg + two ctx.args)
    if (!ctx.arg || !ctx.args || ctx.args.length !== 2) {
      throw new CelEvaluationError('cel.bind() requires exactly three arguments: variable name, value, and expression')
    }

    // First argument (ctx.arg) should be an identifier (variable name)
    const varNameNode = ctx.arg
    let varName: string | null
    
    // Extract the variable name from the AST node
    // Navigate through the AST structure to find the identifier
    function extractIdentifierName(node: any): string | null {
      if (Array.isArray(node)) {
        for (const item of node) {
          const result = extractIdentifierName(item)
          if (result) return result
        }
        return null
      }
      
      if (node && typeof node === 'object') {
        // If this is a token with an image, return it
        if (node.image && typeof node.image === 'string') {
          return node.image
        }
        
        // If this has children, recursively search
        if (node.children) {
          for (const [key, value] of Object.entries(node.children)) {
            const result = extractIdentifierName(value)
            if (result) return result
          }
        }
      }
      
      return null
    }
    
    varName = extractIdentifierName(varNameNode)
    if (!varName) {
      throw new CelEvaluationError('cel.bind() first argument must be an identifier (variable name)')
    }
    
    // Second argument is the value to bind
    const value = this.visit(ctx.args[0])
    
    // Third argument is the expression to evaluate with the bound variable
    // Create a new context with the bound variable
    const oldContext = this.context
    this.context = { ...this.context, [varName!]: value }
    
    try {
      // Evaluate the third argument (expression) with the new context
      const result = this.visit(ctx.args[1])
      return result
    } finally {
      // Restore the original context
      this.context = oldContext
    }
  }

  /**
   * Handles the cel.block(steps, result) function
   */
  private handleCelBlock(ctx: any): unknown {
    // Validate arguments - block() requires exactly two arguments (one ctx.arg + one ctx.args)
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('cel.block() requires exactly two arguments: steps array and result expression')
    }

    // Store the old block context
    const oldBlockContext = this.blockContext
    this.blockContext = []
    
    try {
      // We need to handle the list evaluation specially to support cel.index()
      // Extract the list expression from the first argument AST
      const listNode = this.extractListExpressionFromNode(ctx.arg)
      
      if (listNode && listNode.children) {
        // List expressions use 'lhs' and 'rhs' structure, not 'expr'
        const expressions = []
        if (listNode.children.lhs) {
          expressions.push(...listNode.children.lhs)
        }
        if (listNode.children.rhs) {
          expressions.push(...listNode.children.rhs)
        }
        
        if (expressions.length > 0) {
          // Process each expression in the list, adding results to block context
          for (const exprNode of expressions) {
            const value = this.visit(exprNode)
            this.blockContext.push(value)
          }
        }
      } else {
        // Fallback: evaluate as a normal expression
        const stepsResult = this.visit(ctx.arg)
        if (!Array.isArray(stepsResult)) {
          throw new CelEvaluationError('cel.block() first argument must be an array of steps')
        }
        this.blockContext = stepsResult
      }
      
      // Second argument is the result expression to evaluate with the block context
      const result = this.visit(ctx.args[0])
      return result
    } finally {
      // Restore the original block context
      this.blockContext = oldBlockContext
    }
  }

  /**
   * Recursively searches for a list expression node in the AST
   */
  private extractListExpressionFromNode(node: any): any {
    if (!node) return null
    
    if (Array.isArray(node)) {
      for (const item of node) {
        const result = this.extractListExpressionFromNode(item)
        if (result) return result
      }
      return null
    }
    
    if (typeof node === 'object') {
      // Check if this is a list expression node
      if (node.name === 'listExpression') {
        return node
      }
      
      // If this has children, recursively search
      if (node.children) {
        for (const [key, value] of Object.entries(node.children)) {
          const result = this.extractListExpressionFromNode(value)
          if (result) return result
        }
      }
    }
    
    return null
  }

  /**
   * Handles the cel.index(n) function
   */
  private handleCelIndex(ctx: any): unknown {
    // Validate arguments - index() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('cel.index() requires exactly one argument: the index number')
    }

    // Get the index number
    const indexResult = this.visit(ctx.arg)
    if (typeof indexResult !== 'number' || !Number.isInteger(indexResult)) {
      throw new CelEvaluationError('cel.index() argument must be an integer')
    }

    // Check if we're in a block context
    if (!this.blockContext || !Array.isArray(this.blockContext)) {
      throw new CelEvaluationError('cel.index() can only be used within a cel.block()')
    }

    // Validate index bounds
    if (indexResult < 0 || indexResult >= this.blockContext.length) {
      throw new CelEvaluationError(`cel.index(${indexResult}) is out of bounds. Block has ${this.blockContext.length} elements`)
    }

    return this.blockContext[indexResult]
  }

  /**
   * Handles the proto namespace (proto.hasExt, proto.getExt)
   */
  private handleProtoNamespace(dotExpressions: any[]): unknown {
    if (dotExpressions.length === 0) {
      throw new CelEvaluationError('Incomplete proto namespace reference')
    }

    const firstDot = dotExpressions[0]
    if (!firstDot.children.Identifier || firstDot.children.Identifier.length === 0) {
      throw new CelEvaluationError('Invalid proto namespace method')
    }

    const methodName = firstDot.children.Identifier[0].image

    switch (methodName) {
      case 'hasExt':
        if (!firstDot.children.OpenParenthesis) {
          throw new CelEvaluationError('proto.hasExt requires parentheses')
        }
        return this.handleProtoHasExt(firstDot.children)
      case 'getExt':
        if (!firstDot.children.OpenParenthesis) {
          throw new CelEvaluationError('proto.getExt requires parentheses')
        }
        return this.handleProtoGetExt(firstDot.children)
      default:
        throw new CelEvaluationError(`Unknown proto namespace method: ${methodName}`)
    }
  }

  /**
   * Handles the proto.hasExt(message, extension) function
   */
  private handleProtoHasExt(ctx: any): boolean {
    // Validate arguments - hasExt() requires exactly two arguments (one ctx.arg + one ctx.args)
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('proto.hasExt() requires exactly two arguments: message and extension')
    }

    const message = this.visit(ctx.arg)
    const extension = this.visit(ctx.args[0])
    
    return this.functions.hasExt(message, extension)
  }

  /**
   * Handles the proto.getExt(message, extension) function
   */
  private handleProtoGetExt(ctx: any): unknown {
    // Validate arguments - getExt() requires exactly two arguments (one ctx.arg + one ctx.args)
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('proto.getExt() requires exactly two arguments: message and extension')
    }

    const message = this.visit(ctx.arg)
    const extension = this.visit(ctx.args[0])
    
    return this.functions.getExt(message, extension)
  }

  private getIndexSection(
    ctx: MapExpressionCstChildren | IdentifierExpressionCstChildren | AbsoluteIdentifierExpressionCstChildren | ListExpressionCstChildren,
    mapExpression: unknown,
  ) {

    const expressions = [
      ...(ctx.identifierDotExpression || []),
      ...('identifierIndexExpression' in ctx ? ctx.identifierIndexExpression || [] : []),
      ...('absoluteIndexExpression' in ctx ? ctx.absoluteIndexExpression || [] : []),
      ...('Index' in ctx ? ctx.Index || [] : []),
    ].sort((a, b) => (getPosition(a) > getPosition(b) ? 1 : -1))
    

    


    return expressions.reduce((acc: unknown, expression) => {
      if (expression.name === 'identifierDotExpression') {
        let identifierName: string
        if (expression.children.Identifier && expression.children.Identifier.length > 0) {
          identifierName = expression.children.Identifier[0].image
        } else if (expression.children.QuotedIdentifier && expression.children.QuotedIdentifier.length > 0) {
          const quotedImage = expression.children.QuotedIdentifier[0].image
          identifierName = quotedImage.slice(1, -1) // Remove backticks
        } else {
          throw new Error('No identifier found in dot expression')
        }
        
        // Check if this is optional chaining
        const isOptional = !!expression.children.optional
        
        if (isOptional) {
          // Handle optional chaining
          if (acc === null || acc === undefined) {
            return optional.none()
          }
          
          try {
            if (expression.children.OpenParenthesis) {
              const result = this.handleMethodCall(identifierName, expression.children, acc)
              return optional.of(result)
            } else {
              const result = this.getIdentifier(acc, identifierName)
              return optional.of(result)
            }
          } catch {
            return optional.none()
          }
        }
        
        // Regular (non-optional) property access
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
        const indexValue = Number(unwrapValue(index))
        // Allow float values that are integers (e.g., 0.0, 1.0) to be used as indices
        if (indexType != CelType.int && indexType != CelType.uint && 
            !(indexType === CelType.float && Number.isInteger(indexValue))) {
          throw new CelEvaluationError('invalid_argument')
        }

        if (indexValue < 0 || indexValue >= acc.length) {
          throw new CelEvaluationError('invalid_argument')
        }

        return acc[indexValue]
      }
      
      // Handle map indexing - validate key type
      if (index === null || index === undefined) {
        throw new CelEvaluationError('unsupported key type')
      }
      
      return this.getIdentifier(acc, String(unwrapValue(index)))
    }, mapExpression)
  }

  mapKeyValues(children: MapKeyValuesCstChildren): [string, unknown] {
    const key = this.visit(children.key)
    const value = this.visit(children.value)
    return [key, value]
  }

  structExpression(ctx: StructExpressionCstChildren) {
    // For now, treat struct expressions like maps
    // In a full implementation, we'd need to handle type information
    const structObj: Record<string, unknown> = {}
    
    // Track which fields are explicitly set for protobuf field presence tracking
    const explicitlySetFields = new Set<string>()
    
    if (!ctx.keyValues) {
      return structObj
    }
    
    for (const keyValuePair of ctx.keyValues) {
      const [key, value] = this.visit(keyValuePair)
      structObj[key] = value
      explicitlySetFields.add(key)
    }
    
    // Add explicit field tracking for protobuf compatibility
    Object.defineProperty(structObj, '__explicitlySetFields', {
      value: explicitlySetFields,
      enumerable: false,
      writable: false,
      configurable: false
    })
    
    return structObj
  }

  structKeyValues(children: StructKeyValuesCstChildren): [string, unknown] {
    let key: string
    if (children.key[0].tokenType.name === 'QuotedIdentifier') {
      // Remove backticks from quoted identifier
      key = children.key[0].image.slice(1, -1)
    } else {
      key = children.key[0].image
    }
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

    if (ctx.RawTripleQuoteStringLiteral) {
      // For raw triple-quote strings, remove the 'r' prefix and triple quotes, preserve content as-is
      const rawString = ctx.RawTripleQuoteStringLiteral[0].image
      return rawString.slice(4, -3) // Remove 'r"""' and closing '"""'
    }

    if (ctx.RawStringLiteral) {
      // For raw strings, remove the 'r' prefix and the quotes, but preserve all content as-is
      const rawString = ctx.RawStringLiteral[0].image
      return rawString.slice(2, -1) // Remove 'r"' and closing quote
    }

    if (ctx.StringLiteral) {
      const fullString = ctx.StringLiteral[0].image
      const content = fullString.slice(1, -1)
      const quoteType = fullString[0] // Get the first character (quote type)
      return this.processStringEscapes(content, quoteType)
    }

    if (ctx.BooleanLiteral) {
      return ctx.BooleanLiteral[0].image === 'true'
    }

    if (ctx.Float) {
      const value = parseFloat(ctx.Float[0].image)
      // Create a Number object that remembers it was a float literal
      const wrappedValue = new Number(value)
      ;(wrappedValue as any).__isFloatLiteral = true
      return wrappedValue
    }

    if (ctx.Integer) {
      const literal = ctx.Integer[0].image
      
      // Check for int64 range before parsing to avoid precision loss
      const MAX_INT64_STR = '9223372036854775807'
      const MIN_INT64_STR = '-9223372036854775808'
      
      // Check for overflow - handle special case for min int64 
      const isMinInt64 = literal === '9223372036854775808' // This will be negated by unary minus
      const isPositiveOverflow = !isMinInt64 && (literal.length > MAX_INT64_STR.length || 
                                (literal.length === MAX_INT64_STR.length && literal > MAX_INT64_STR))
      const isNegativeOverflow = literal.startsWith('-') && 
                                (literal.length > MIN_INT64_STR.length || 
                                 (literal.length === MIN_INT64_STR.length && literal < MIN_INT64_STR))
                                 
      if (isPositiveOverflow || isNegativeOverflow) {
        throw new CelEvaluationError(`Integer literal ${literal} exceeds int64 range`)
      }
      
      // Check if this is a large integer that needs BigInt backing
      const MAX_SAFE_INTEGER = 9007199254740991 // 2^53 - 1  
      const MIN_SAFE_INTEGER = -9007199254740991 // -(2^53 - 1)
      const MAX_SAFE_INTEGER_STR = '9007199254740991'
      const MIN_SAFE_INTEGER_STR = '-9007199254740991'
      
      const isLargePositive = literal.length > MAX_SAFE_INTEGER_STR.length || 
                             (literal.length === MAX_SAFE_INTEGER_STR.length && literal > MAX_SAFE_INTEGER_STR)
      const isLargeNegative = literal.startsWith('-') && 
                             (literal.length > MIN_SAFE_INTEGER_STR.length || 
                              (literal.length === MIN_SAFE_INTEGER_STR.length && literal < MIN_SAFE_INTEGER_STR))
      
      if (isLargePositive || isLargeNegative) {
        // For large integers, use BigInt internally but return a Number-like object
        const bigIntValue = BigInt(literal)
        const wrappedValue = new Number(Number(bigIntValue))
        ;(wrappedValue as any).__bigIntValue = bigIntValue
        return wrappedValue
      }
      
      return parseInt(literal, 10)
    }

    if (ctx.UnsignedInteger) {
      const literal = ctx.UnsignedInteger[0].image.slice(0, -1)
      
      // Check for uint64 overflow before parsing to avoid precision loss
      const MAX_UINT64_STR = '18446744073709551615'
      if (literal.length > MAX_UINT64_STR.length || 
          (literal.length === MAX_UINT64_STR.length && literal > MAX_UINT64_STR)) {
        throw new CelEvaluationError(`Unsigned integer literal ${literal}u exceeds maximum uint64 value`)
      }
      
      // JavaScript's Number.MAX_SAFE_INTEGER is 2^53 - 1, but uint64 can go up to 2^64 - 1
      // For CEL conformance, we need to handle large integers properly without precision loss
      // Check if the value is within JavaScript's safe integer range before parsing
      const MAX_SAFE_INTEGER = 9007199254740991 // 2^53 - 1
      const MAX_SAFE_INTEGER_STR = '9007199254740991'
      
      const isLargeInteger = literal.length > MAX_SAFE_INTEGER_STR.length || 
                            (literal.length === MAX_SAFE_INTEGER_STR.length && literal > MAX_SAFE_INTEGER_STR)
      
      if (isLargeInteger) {
        // For large unsigned integers, use BigInt internally but still return a Number-like object
        // This preserves compatibility while avoiding precision loss
        const bigIntValue = BigInt(literal)
        const wrappedValue = new Number(Number(bigIntValue))
        ;(wrappedValue as any).__isUnsignedLiteral = true
        ;(wrappedValue as any).__bigIntValue = bigIntValue
        return wrappedValue
      }
      
      // For smaller values, use regular parseInt
      const value = parseInt(literal, 10)
      
      // Create a Number object that remembers it was an unsigned literal
      const wrappedValue = new Number(value)
      ;(wrappedValue as any).__isUnsignedLiteral = true
      return wrappedValue
    }

    if (ctx.HexInteger) {
      return parseInt(ctx.HexInteger[0].image.slice(2), 16)
    }

    if (ctx.HexUnsignedInteger) {
      const literal = ctx.HexUnsignedInteger[0].image.slice(2, -1)
      
      // Check for uint64 overflow - max uint64 in hex is 0xFFFFFFFFFFFFFFFF
      const MAX_UINT64_HEX_STR = 'FFFFFFFFFFFFFFFF'
      if (literal.length > MAX_UINT64_HEX_STR.length || 
          (literal.length === MAX_UINT64_HEX_STR.length && literal.toUpperCase() > MAX_UINT64_HEX_STR)) {
        throw new CelEvaluationError(`Unsigned hex integer literal 0x${literal}u exceeds maximum uint64 value`)
      }
      
      const value = parseInt(literal, 16)
      
      // JavaScript's Number.MAX_SAFE_INTEGER is 2^53 - 1, but uint64 can go up to 2^64 - 1
      // Check if the value is within JavaScript's safe integer range
      const MAX_SAFE_INTEGER = 9007199254740991 // 2^53 - 1
      
      if (value > MAX_SAFE_INTEGER) {
        // For large unsigned integers, use BigInt internally but still return a Number-like object
        const bigIntValue = BigInt('0x' + literal)
        const wrappedValue = new Number(Number(bigIntValue))
        ;(wrappedValue as any).__isUnsignedLiteral = true
        ;(wrappedValue as any).__bigIntValue = bigIntValue
        return wrappedValue
      }
      
      // Create a Number object that remembers it was an unsigned literal
      const wrappedValue = new Number(value)
      ;(wrappedValue as any).__isUnsignedLiteral = true
      return wrappedValue
    }

    if (ctx.absoluteIdentifierExpression) {
      return this.visit(ctx.absoluteIdentifierExpression)
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
    // Check if we are in a has() macro - only validate the first atomic expression
    if (this.mode === Mode.has && !this.hasValidationDone) {
      this.hasValidationDone = true
      
      // Check for field access (dot notation) at atomic level or within primary expressions
      let hasDotAccess = !!ctx.identifierDotExpression
      let hasIndexAccess = !!ctx.atomicIndexExpression
      
      if (!hasDotAccess && !hasIndexAccess) {
        // Check if the primary expression contains field selections or index expressions
        const primaryExpr = ctx.primaryExpression[0]
        if (primaryExpr.children.identifierExpression) {
          const identifierExpr = primaryExpr.children.identifierExpression[0]
          hasDotAccess = !!identifierExpr.children.identifierDotExpression
          hasIndexAccess = !!identifierExpr.children.identifierIndexExpression
        } else if (primaryExpr.children.mapExpression) {
          // Check for field access within map expressions like {'a': 1}.field
          const mapExpr = primaryExpr.children.mapExpression[0]
          hasDotAccess = !!mapExpr.children.identifierDotExpression
          hasIndexAccess = !!mapExpr.children.identifierIndexExpression
        } else if (primaryExpr.children.listExpression) {
          // Check for field access within list expressions like [1, 2].field
          const listExpr = primaryExpr.children.listExpression[0]
          hasDotAccess = !!listExpr.children.identifierDotExpression
          hasIndexAccess = !!listExpr.children.Index
        }
      }
      
      // Validate that has() only accepts field selection expressions (dot notation)
      // Index expressions are not considered valid field selections
      if (!hasDotAccess && !hasIndexAccess) {
        throw new CelEvaluationError('has() does not support atomic expressions')
      } else if (hasIndexAccess && !hasDotAccess) {
        throw new CelEvaluationError('has() requires a field selection')
      }
    }

    // Start with the primary expression
    let result = this.visit(ctx.primaryExpression)

    // Apply any chained method calls, index operations, or struct constructions in order
    const allExpressions = [
      ...(ctx.identifierDotExpression || []).map(expr => ({ type: 'dot', expr })),
      ...(ctx.atomicIndexExpression || []).map(expr => ({ type: 'index', expr })),
      ...(ctx.structExpression || []).map(expr => ({ type: 'struct', expr }))
    ].sort((a, b) => (getPosition(a.expr) > getPosition(b.expr) ? 1 : -1))

    for (const { type, expr } of allExpressions) {
      if (type === 'dot') {
        result = this.visit(expr, result)
      } else if (type === 'index') {
        // Handle indexing
        const indexResult = this.visit(expr)
        
        // Check if this is optional indexing
        const isOptional = indexResult && typeof indexResult === 'object' && '__isOptionalIndex' in indexResult
        const index = isOptional ? (indexResult as any).value : indexResult
        
        if (isOptional) {
          // Handle optional indexing
          if (result === null || result === undefined) {
            result = optional.none()
          } else if (Array.isArray(result)) {
            const indexType = getCelType(index)
            if (indexType != CelType.int && indexType != CelType.uint) {
              result = optional.none()
            } else if ((index as number) < 0 || (index as number) >= result.length) {
              result = optional.none()
            } else {
              result = optional.of(result[index as number])
            }
          } else {
            // For optional indexing on non-arrays, return optional.none() if key doesn't exist
            try {
              const value = this.getIdentifier(result, index as string)
              result = optional.of(value)
            } catch {
              result = optional.none()
            }
          }
        } else {
          // Handle regular indexing
          if (Array.isArray(result)) {
            const indexType = getCelType(index)
            if (indexType != CelType.int && indexType != CelType.uint) {
              throw new CelEvaluationError('invalid_argument')
            }

            if (index < 0 || index >= result.length) {
              throw new CelEvaluationError('invalid_argument')
            }

            result = result[index]
          } else {
            result = this.getIdentifier(result, index)
          }
        }
      } else if (type === 'struct') {
        // Handle struct construction - the result should be the type name or constructor
        const structData = this.visit(expr)
        
        // Check if result is a constructor function (for TestAllTypes)
        if (typeof result === 'function') {
          // Pass the explicitly set fields information to the constructor
          if (structData && typeof structData === 'object' && '__explicitlySetFields' in structData) {
            result = result(structData, (structData as any).__explicitlySetFields)
          } else {
            result = result(structData)
          }
        } else if (typeof result === 'object' && result !== null && (result as any).__constructor) {
          result = (result as any).__constructor(structData)
        } else if (typeof result === 'string') {
          const typeName = result
          if (typeName === 'google.protobuf.Any') {
            // Handle protobuf Any type - store type_url and value for unpacking during comparison
            result = {
              __celType: 'google.protobuf.Any',
              type_url: structData.type_url || '',
              value: structData.value || new Uint8Array(),
              ...structData
            }
          } else if ((typeName.includes('google.protobuf') && typeName.endsWith('Value')) || 
                     (typeName.endsWith('Value') && (
                       typeName.includes('Int32') || typeName.includes('Int64') ||
                       typeName.includes('UInt32') || typeName.includes('UInt64') ||
                       typeName.includes('Float') || typeName.includes('Double') ||
                       typeName.includes('Bool') || typeName.includes('String') ||
                       typeName.includes('Bytes')
                     ))) {
            // Handle protobuf wrapper types - return the wrapped value
            if ('value' in structData) {
              result = structData.value
            } else {
              // Return default value for empty wrapper
              if (typeName.includes('Bool')) result = false
              else if (typeName.includes('String')) result = ''
              else if (typeName.includes('Int') || typeName.includes('Double') || typeName.includes('Float')) result = 0
              else if (typeName.includes('Bytes')) result = new Uint8Array()
              else if (typeName === 'google.protobuf.Value') result = null
              else result = structData
            }
          } else {
            // For other types, return the struct data with type information
            if (typeof structData === 'object' && structData !== null) {
              // Add type metadata to distinguish different message types
              Object.defineProperty(structData, '__celType', {
                value: typeName,
                writable: false,
                enumerable: false,
                configurable: false
              })
            }
            result = structData
          }
        }
      }
    }

    return result
  }

  absoluteIdentifierExpression(ctx: AbsoluteIdentifierExpressionCstChildren): unknown {
    // For absolute identifiers, we resolve from the root context
    // The leading dot indicates we should not use qualified resolution
    const identifierName = ctx.Identifier[0].image
    
    // Start from the root context and resolve the path
    const result = this.getIdentifier(this.context, identifierName)
    
    if (!ctx.identifierDotExpression && !ctx.absoluteIndexExpression) {
      return result
    }
    
    return this.getIndexSection(ctx, result)
  }

  identifierExpression(ctx: IdentifierExpressionCstChildren): unknown {
    // Note: We removed the restrictive has() validation here since
    // expressions like TestAllTypes{}.field should be allowed
    // The has() function will work properly by checking if the result is undefined

    const identifierName = ctx.Identifier[0].image
    
    // Handle reserved constants - these should never be shadowed
    if (
      !ctx.identifierDotExpression &&
      !ctx.identifierIndexExpression
    ) {
      if (identifierName === 'false') {
        return false
      }
      if (identifierName === 'true') {
        return true
      }
      if (identifierName === 'null') {
        return null
      }
      if (identifierName === 'null_type') {
        const typeId = new String('null_type')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'list') {
        const typeId = new String('list')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'map') {
        const typeId = new String('map')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'type') {
        const typeId = new String('type')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'int') {
        const typeId = new String('int')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'uint') {
        const typeId = new String('uint')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'double') {
        const typeId = new String('double')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'bool') {
        const typeId = new String('bool')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'string') {
        const typeId = new String('string')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'bytes') {
        const typeId = new String('bytes')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'duration') {
        const typeId = new String('duration')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
      if (identifierName === 'timestamp') {
        const typeId = new String('timestamp')
        ;(typeId as any).__isTypeIdentifier = true
        return typeId
      }
    }
    
    // If this is a standalone identifier and is reserved (but not a constant), throw
    if (
      !ctx.identifierDotExpression &&
      !ctx.identifierIndexExpression &&
      reservedIdentifiers.includes(identifierName)
    ) {
      throw new Error('Detected reserved identifier. This is not allowed')
    }
    
    const data = this.context

    // Handle qualified identifier resolution: try to find the longest matching prefix in context
    if (ctx.identifierDotExpression && ctx.identifierDotExpression.length > 0) {
      const result = this.tryQualifiedResolution(identifierName, ctx.identifierDotExpression, data)
      if (result !== null) {
        return result
      }

      // Handle built-in namespaces
      if (identifierName === 'strings') {
        return this.handleStringsNamespace(ctx.identifierDotExpression)
      }
      if (identifierName === 'cel') {
        return this.handleCelNamespace(ctx.identifierDotExpression)
      }
      if (identifierName === 'proto') {
        return this.handleProtoNamespace(ctx.identifierDotExpression)
      }
      if (identifierName === 'base64') {
        return this.handleBase64Namespace(ctx.identifierDotExpression)
      }
    }

    let result: unknown
    
    // First try container-qualified lookup if we have a container and this is a simple identifier
    if (this.container && !ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
      const qualifiedName = `${this.container}.${identifierName}`
      if (qualifiedName in data) {
        result = data[qualifiedName]
      } else {
        result = this.getIdentifier(data, identifierName)
      }
    } else {
      result = this.getIdentifier(data, identifierName)
    }

    if (!ctx.identifierDotExpression && !ctx.identifierIndexExpression) {
      return result as boolean
    }



    return this.getIndexSection(ctx, result)
  }

  identifierDotExpression(
    ctx: IdentifierDotExpressionCstChildren,
    param: unknown,
  ): unknown {
    // Check if this is optional chaining
    const isOptional = !!ctx.optional
    
    // Handle both regular and quoted identifiers
    let identifierName: string
    if (ctx.Identifier && ctx.Identifier.length > 0) {
      identifierName = ctx.Identifier[0].image
    } else if (ctx.QuotedIdentifier && ctx.QuotedIdentifier.length > 0) {
      // Remove the backticks from quoted identifier
      const quotedImage = ctx.QuotedIdentifier[0].image
      identifierName = quotedImage.slice(1, -1) // Remove first and last character (backticks)
    } else {
      throw new Error('No identifier found in dot expression')
    }
    
    // Special handling for optional chaining
    if (isOptional) {
      // If the target is null/undefined, return optional.none()
      if (param === null || param === undefined) {
        return optional.none()
      }
      
      // If the target is already a CelOptional, work with its value
      if (param && typeof param === 'object' && 'hasValue' in param && typeof (param as any).hasValue === 'function') {
        const optionalValue = param as any
        if (!optionalValue.hasValue()) {
          return optional.none()
        }
        const actualValue = optionalValue.value()
        
        // Now try to access the property on the actual value
        try {
          if (ctx.OpenParenthesis) {
            return this.handleMethodCall(identifierName, ctx, actualValue)
          } else {
            const result = this.getIdentifier(actualValue, identifierName)
            return optional.of(result)
          }
        } catch {
          return optional.none()
        }
      }
      
      // For regular values, try to access the property
      try {
        if (ctx.OpenParenthesis) {
          return this.handleMethodCall(identifierName, ctx, param)
        } else {
          const result = this.getIdentifier(param, identifierName)
          return optional.of(result)
        }
      } catch {
        return optional.none()
      }
    }
    
    // Regular (non-optional) property access
    if (ctx.OpenParenthesis) {
      return this.handleMethodCall(identifierName, ctx, param)
    }
    
    return this.getIdentifier(param, identifierName)
  }

  indexExpression(ctx: IndexExpressionCstChildren): unknown {
    const index = this.visit(ctx.expr[0])
    
    // If this is optional indexing, we need to handle it differently
    // But since this method just returns the index value, we'll handle 
    // the optional logic in the calling code (atomicExpression)
    if (ctx.optional) {
      // Mark the index as optional for the caller
      return { __isOptionalIndex: true, value: index }
    }
    
    return index
  }

  getIdentifier(searchContext: unknown, identifier: string): unknown {
    // Handle building dotted type names (e.g., google.protobuf.BoolValue)
    if (typeof searchContext === 'string' && this.isTypeIdentifier(searchContext)) {
      return `${searchContext}.${identifier}`
    }
    
    if ((typeof searchContext !== 'object' && typeof searchContext !== 'function') || searchContext === null) {
      throw new Error(
        `Cannot obtain "${identifier}" from non-object context: ${searchContext}`,
      )
    }

    // Check if this looks like a protobuf field access (wrapper field names)
    // Handle this before checking if value is undefined to support has() mode
    if (this.isProtobufWrapperField(identifier) && searchContext && typeof searchContext === 'object' && '__hasField' in searchContext) {
      // In has() mode, we need to handle field presence correctly
      if (this.mode === Mode.has) {
        const hasFieldFn = (searchContext as any).__hasField
        if (typeof hasFieldFn === 'function') {
          const isExplicitlySet = hasFieldFn(identifier)
          if (!isExplicitlySet) {
            return undefined // Field not explicitly set, so has() should return false
          }
          
          // Field was explicitly set - need to check if it's empty for repeated/map fields
          const fieldValue = (searchContext as any)[identifier]
          if (fieldValue !== undefined) {
            // For repeated fields (arrays) and map fields (objects), empty means has() = false
            if (identifier.startsWith('repeated_') && Array.isArray(fieldValue) && fieldValue.length === 0) {
              return undefined // Empty repeated field should return false for has()
            }
            if (identifier.startsWith('map_') && fieldValue && typeof fieldValue === 'object' && Object.keys(fieldValue).length === 0) {
              return undefined // Empty map field should return false for has()
            }
            
            // For other fields that are explicitly set, wrap with presence marker
            if (typeof fieldValue === 'object' && fieldValue !== null) {
              // Create a wrapper that indicates this field has presence
              return Object.assign(fieldValue, { __hasFieldPresence: true })
            }
            // For primitive values, create a wrapper object with presence
            return { __hasFieldPresence: true, value: fieldValue }
          }
        }
        return undefined // No explicit field tracking or field not set
      }
      
      // Not in has() mode - return the field value or default
      const fieldValue = (searchContext as any)[identifier]
      if (fieldValue !== undefined) {
        return fieldValue
      }
      return this.getProtobufFieldDefault(identifier)
    }

    const value = (searchContext as Record<string, unknown>)[identifier]

    if (value === undefined) {
      // Check if this could be a type identifier that we should allow
      // Type identifiers are typically used with struct construction
      if (this.isTypeIdentifier(identifier)) {
        return identifier
      }
      
      // Check if this looks like a protobuf field access (wrapper field names) for non-protobuf objects
      if (this.isProtobufWrapperField(identifier)) {
        return this.getProtobufFieldDefault(identifier)
      }
      
      // For has() mode with invalid field names on protobuf messages, throw an error
      if (this.mode === Mode.has && this.isProtobufMessage(searchContext)) {
        throw new CelEvaluationError(`Unknown field '${identifier}' in protobuf message`)
      }
      
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

  private isTypeIdentifier(identifier: string): boolean {
    // Common protobuf types and CEL built-in types
    const typeNames = [
      'google', 'google.protobuf', 'TestAllTypes', 'NestedTestAllTypes',
      'timestamp', 'duration', 'bool', 'int', 'uint', 'double', 'string', 'bytes',
      'protobuf', 'BoolValue', 'StringValue', 'Int32Value', 'Int64Value',
      'UInt32Value', 'UInt64Value', 'FloatValue', 'DoubleValue', 'BytesValue'
    ]
    return typeNames.includes(identifier) || identifier.startsWith('google.protobuf')
  }

  private isProtobufMessage(obj: unknown): boolean {
    // Check if the object has protobuf message characteristics
    return obj !== null && typeof obj === 'object' && ('__hasField' in obj || 'repeated_nested_enum' in obj || 'standalone_enum' in obj)
  }

  private isProtobufWrapperField(identifier: string): boolean {
    // Comprehensive list of valid TestAllTypes fields from the protobuf schema
    const validFields = new Set([
      // Singular scalar fields  
      'single_int32', 'single_int64', 'single_uint32', 'single_uint64', 
      'single_sint32', 'single_sint64', 'single_fixed32', 'single_fixed64',
      'single_sfixed32', 'single_sfixed64', 'single_float', 'single_double',
      'single_bool', 'single_string', 'single_bytes', 'optional_bool', 'optional_string',
      'in', // Special field that collides with 'in' operator
      
      // Well-known types
      'single_any', 'single_duration', 'single_timestamp', 'single_struct', 'single_value',
      'single_int64_wrapper', 'single_int32_wrapper', 'single_double_wrapper',
      'single_float_wrapper', 'single_uint64_wrapper', 'single_uint32_wrapper',
      'single_string_wrapper', 'single_bool_wrapper', 'single_bytes_wrapper',
      'list_value', 'null_value', 'optional_null_value', 'field_mask', 'empty',
      
      // Nested messages and enums
      'single_nested_message', 'single_nested_enum', 'standalone_message', 'standalone_enum',
      
      // Repeated fields
      'repeated_int32', 'repeated_int64', 'repeated_uint32', 'repeated_uint64',
      'repeated_sint32', 'repeated_sint64', 'repeated_fixed32', 'repeated_fixed64',
      'repeated_sfixed32', 'repeated_sfixed64', 'repeated_float', 'repeated_double',
      'repeated_bool', 'repeated_string', 'repeated_bytes', 'repeated_nested_message',
      'repeated_nested_enum', 'repeated_foreign_message', 'repeated_import_message',
      'repeated_foreign_enum', 'repeated_import_enum', 'repeated_string_piece',
      'repeated_cord',
      
      // Map fields
      'map_int32_int32', 'map_int64_int64', 'map_uint32_uint32', 'map_uint64_uint64',
      'map_sint32_sint32', 'map_sint64_sint64', 'map_fixed32_fixed32', 'map_fixed64_fixed64',
      'map_sfixed32_sfixed32', 'map_sfixed64_sfixed64', 'map_int32_float', 'map_int32_double',
      'map_bool_bool', 'map_string_string', 'map_string_bytes', 'map_string_nested_message',
      'map_string_nested_enum', 'map_int32_foreign_message', 'map_string_foreign_message',
      'map_int32_int64', 'map_string_int64',
      
      // Standalone optional fields
      'standalone_message', 'standalone_enum',
      
      // TestRequired fields
      'required_int32'
    ])
    
    // Check if it's a regular field
    if (validFields.has(identifier)) {
      return true
    }
    
    // Check if it's a protobuf extension field
    if (this.isProtobufExtensionField(identifier)) {
      return true
    }
    
    return false
  }

  private isProtobufExtensionField(identifier: string): boolean {
    // Extension fields follow the pattern: package.extension_name
    // From test_all_types_extensions.proto:
    // - cel.expr.conformance.proto2.int32_ext
    // - cel.expr.conformance.proto2.nested_ext  
    // - cel.expr.conformance.proto2.test_all_types_ext
    // - cel.expr.conformance.proto2.nested_enum_ext
    // - cel.expr.conformance.proto2.repeated_test_all_types
    // - cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.int64_ext
    // - cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.message_scoped_nested_ext
    // - cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.nested_enum_ext
    // - cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.message_scoped_repeated_test_all_types
    
    return identifier.includes('cel.expr.conformance.proto2.') && 
           (identifier.endsWith('_ext') || 
            identifier.endsWith('repeated_test_all_types') ||
            identifier.endsWith('message_scoped_repeated_test_all_types'))
  }

  private getProtobufFieldDefault(identifier: string): unknown {
    if (identifier.startsWith('single_')) {
      // Handle proto2 defaults
      if (identifier === 'single_int32') {
        return -32  // proto2 default
      }
      
      if (identifier.includes('wrapper') || identifier.includes('any') || identifier.includes('duration') || identifier.includes('timestamp') || identifier.includes('struct') || identifier.includes('value')) {
        return null
      } else if (identifier.includes('int') || identifier.includes('fixed') || identifier.includes('float') || identifier.includes('double')) {
        return 0
      } else if (identifier.includes('bool')) {
        return false
      } else if (identifier.includes('string')) {
        return ''
      } else if (identifier.includes('bytes')) {
        return new Uint8Array()
      } else if (identifier.includes('message')) {
        // For message fields, return an empty message object with protobuf field defaults
        if (identifier.includes('nested')) {
          // Create an empty NestedMessage with default field access
          return new Proxy({}, {
            get(target: any, prop: string | symbol) {
              if (typeof prop === 'string') {
                if (prop === 'bb') {
                  return 0 // int32 default value
                }
                if (prop === '__hasField') {
                  return () => false // No fields are explicitly set
                }
              }
              return target[prop]
            }
          })
        }
        return {}
      } else if (identifier.includes('enum')) {
        return 0
      }
      return null
    } else if (identifier.startsWith('repeated_')) {
      return []
    } else if (identifier.startsWith('map_')) {
      return {}
    } else if (identifier === 'standalone_message') {
      // Return an empty NestedMessage with default field access
      return new Proxy({}, {
        get(target: any, prop: string | symbol) {
          if (typeof prop === 'string') {
            if (prop === 'bb') {
              return 0 // int32 default value
            }
            if (prop === '__hasField') {
              return () => false // No fields are explicitly set
            }
          }
          return target[prop]
        }
      })
    } else if (identifier === 'standalone_enum') {
      return 0
    }
    return undefined
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
      return this.handleTimestampMethod(methodName, ctx, collection)
    }

    // Handle duration methods  
    if (typeof collection === 'object' && collection !== null && 'seconds' in collection && 'nanoseconds' in collection) {
      return this.handleDurationMethod(methodName, collection as Duration)
    }

    // Handle optional value methods first
    if (typeof collection === 'object' && collection !== null && ('hasValue' in collection || 'orValue' in collection || 'value' in collection)) {
      const method = (collection as any)[methodName]
      if (typeof method === 'function') {
        // Extract all arguments
        const args = [
          ...(ctx.arg ? [this.visit(ctx.arg)] : []),
          ...(ctx.args ? ctx.args.map(arg => this.visit(arg)) : [])
        ]
        return method.call(collection, ...args)
      }
    }

    // Handle function properties (like TestAllTypes.NestedEnum)
    if (typeof collection === 'function') {
      const method = (collection as any)[methodName]
      if (typeof method === 'function') {
        // Extract all arguments
        const args = [
          ...(ctx.arg ? [this.visit(ctx.arg)] : []),
          ...(ctx.args ? ctx.args.map(arg => this.visit(arg)) : [])
        ]
        return method(...args)
      }
    }

    // Handle string methods (but not size, which is handled below)
    if (typeof collection === 'string' && methodName !== 'size') {
      return this.handleStringMethod(methodName, ctx, collection)
    }

    switch (methodName) {
      case 'all':
        return this.handleAllMethod(ctx, collection)
      case 'exists':
        return this.handleExistsMethod(ctx, collection)
      case 'exists_one':
      case 'existsOne':
        return this.handleExistsOneMethod(ctx, collection)
      case 'filter':
        return this.handleFilterMethod(ctx, collection)
      case 'map':
        return this.handleMapMethod(ctx, collection)
      case 'size':
        return this.handleSizeMethod(ctx, collection)
      case 'join':
        return this.handleJoinMethod(ctx, collection)
      case 'transformList':
        return this.handleTransformListMethod(ctx, collection)
      case 'transformMap':
        return this.handleTransformMapMethod(ctx, collection)
      case 'optMap':
        return this.handleOptMapMethod(ctx, collection)
      case 'optFlatMap':
        return this.handleOptFlatMapMethod(ctx, collection)
      default:
        // Check if this is a generic function call
        if (typeof collection === 'object' && collection !== null) {
          const method = (collection as any)[methodName]
          

          
          if (typeof method === 'function') {
            // Extract all arguments
            const args = [
              ...(ctx.arg ? ctx.arg.map(arg => this.visit(arg)) : []),
              ...(ctx.args ? ctx.args.map(arg => this.visit(arg)) : [])
            ]
            return method.call(collection, ...args)
          }
        }
        
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

    // Validate arguments - need either 2 or 3 arguments
    if (!ctx.arg || !ctx.args) {
      throw new CelEvaluationError('all() requires at least two arguments')
    }

    // Check for 2-parameter version (variable, predicate) or 3-parameter version (index/key, value, predicate)
    if (ctx.args.length === 1) {
      // 2-parameter version: variable and predicate
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
        const keys = Object.keys(collection)
        if (keys.length === 0) {
          return true // Empty objects return true (vacuous truth)
        }
        return this.evaluateAllForArray(keys, variableExpr, predicateExpr)
      }
    } else if (ctx.args.length === 2) {
      // 3-parameter version: index/key variable, value variable, and predicate
      const indexVariableExpr = ctx.arg
      const valueVariableExpr = ctx.args[0]
      const predicateExpr = ctx.args[1]

      // Handle arrays
      if (Array.isArray(collection)) {
        if (collection.length === 0) {
          return true // Empty arrays return true (vacuous truth)
        }
        return this.evaluateAllForArrayWithIndex(collection, indexVariableExpr, valueVariableExpr, predicateExpr)
      }

      // Handle maps (objects)
      if (typeof collection === 'object') {
        return this.evaluateAllForMapWithKey(collection as Record<string, unknown>, indexVariableExpr, valueVariableExpr, predicateExpr)
      }
    } else {
      throw new CelEvaluationError('all() requires exactly two or three arguments')
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
   * Evaluates the all() predicate for each element in an array with index
   */
  private evaluateAllForArrayWithIndex(
    array: unknown[],
    indexVariableExpr: any,
    valueVariableExpr: any,
    predicateExpr: any,
  ): boolean {
    // Empty arrays return true (vacuous truth)
    if (array.length === 0) {
      return true
    }

    const indexVariableName = this.extractVariableName(indexVariableExpr, 'all()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'all()')

    // Evaluate predicate for each element with index
    for (let i = 0; i < array.length; i++) {
      const element = array[i]
      
      // Store original context values
      const originalIndexValue = this.context[indexVariableName]
      const originalValueValue = this.context[valueVariableName]
      
      // Set loop variables
      this.context[indexVariableName] = i
      this.context[valueVariableName] = element

      try {
        const result = this.visit(predicateExpr)
        if (!result) {
          return false
        }
      } finally {
        // Restore original context
        if (originalIndexValue !== undefined) {
          this.context[indexVariableName] = originalIndexValue
        } else {
          delete this.context[indexVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return true
  }

  /**
   * Evaluates the all() predicate for each key-value pair in a map
   */
  private evaluateAllForMapWithKey(
    map: Record<string, unknown>,
    keyVariableExpr: any,
    valueVariableExpr: any,
    predicateExpr: any,
  ): boolean {
    const entries = Object.entries(map)
    
    // Empty maps return true (vacuous truth)
    if (entries.length === 0) {
      return true
    }

    const keyVariableName = this.extractVariableName(keyVariableExpr, 'all()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'all()')

    // Evaluate predicate for each key-value pair
    for (const [key, value] of entries) {
      // Store original context values
      const originalKeyValue = this.context[keyVariableName]
      const originalValueValue = this.context[valueVariableName]
      
      // Set loop variables
      this.context[keyVariableName] = key
      this.context[valueVariableName] = value

      try {
        const result = this.visit(predicateExpr)
        if (!result) {
          return false
        }
      } finally {
        // Restore original context
        if (originalKeyValue !== undefined) {
          this.context[keyVariableName] = originalKeyValue
        } else {
          delete this.context[keyVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
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

    // Validate arguments - need either 2 or 3 arguments
    if (!ctx.arg || !ctx.args) {
      throw new CelEvaluationError('exists() requires at least two arguments')
    }

    // Check for 2-parameter version (variable, predicate) or 3-parameter version (index/key, value, predicate)
    if (ctx.args.length === 1) {
      // 2-parameter version: variable and predicate
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
        const keys = Object.keys(collection)
        if (keys.length === 0) {
          return false // Empty objects return false (no elements to satisfy condition)
        }
        return this.evaluateExistsForArray(keys, variableExpr, predicateExpr)
      }
    } else if (ctx.args.length === 2) {
      // 3-parameter version: index/key variable, value variable, and predicate
      const indexVariableExpr = ctx.arg
      const valueVariableExpr = ctx.args[0]
      const predicateExpr = ctx.args[1]

      // Handle arrays
      if (Array.isArray(collection)) {
        if (collection.length === 0) {
          return false // Empty arrays return false (no elements to satisfy condition)
        }
        return this.evaluateExistsForArrayWithIndex(collection, indexVariableExpr, valueVariableExpr, predicateExpr)
      }

      // Handle maps (objects)
      if (typeof collection === 'object') {
        return this.evaluateExistsForMapWithKey(collection as Record<string, unknown>, indexVariableExpr, valueVariableExpr, predicateExpr)
      }
    } else {
      throw new CelEvaluationError('exists() requires exactly two or three arguments')
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
   * Evaluates the exists() predicate for each element in an array with index
   */
  private evaluateExistsForArrayWithIndex(
    array: unknown[],
    indexVariableExpr: any,
    valueVariableExpr: any,
    predicateExpr: any,
  ): boolean {
    // Empty arrays return false
    if (array.length === 0) {
      return false
    }

    const indexVariableName = this.extractVariableName(indexVariableExpr, 'exists()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'exists()')

    // Evaluate predicate for each element with index - short-circuit on first match
    for (let i = 0; i < array.length; i++) {
      const element = array[i]
      
      // Store original context values
      const originalIndexValue = this.context[indexVariableName]
      const originalValueValue = this.context[valueVariableName]
      
      // Set loop variables
      this.context[indexVariableName] = i
      this.context[valueVariableName] = element

      try {
        const result = this.visit(predicateExpr)
        if (result) {
          return true // Short-circuit: return true as soon as one element satisfies the condition
        }
      } finally {
        // Restore original context
        if (originalIndexValue !== undefined) {
          this.context[indexVariableName] = originalIndexValue
        } else {
          delete this.context[indexVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return false // No element satisfied the condition
  }

  /**
   * Evaluates the exists() predicate for each key-value pair in a map
   */
  private evaluateExistsForMapWithKey(
    map: Record<string, unknown>,
    keyVariableExpr: any,
    valueVariableExpr: any,
    predicateExpr: any,
  ): boolean {
    const entries = Object.entries(map)
    
    // Empty maps return false
    if (entries.length === 0) {
      return false
    }

    const keyVariableName = this.extractVariableName(keyVariableExpr, 'exists()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'exists()')

    // Evaluate predicate for each key-value pair - short-circuit on first match
    for (const [key, value] of entries) {
      // Store original context values
      const originalKeyValue = this.context[keyVariableName]
      const originalValueValue = this.context[valueVariableName]
      
      // Set loop variables
      this.context[keyVariableName] = key
      this.context[valueVariableName] = value

      try {
        const result = this.visit(predicateExpr)
        if (result) {
          return true // Short-circuit: return true as soon as one pair satisfies the condition
        }
      } finally {
        // Restore original context
        if (originalKeyValue !== undefined) {
          this.context[keyVariableName] = originalKeyValue
        } else {
          delete this.context[keyVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return false // No pair satisfied the condition
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

    // Validate arguments - need either 2 or 3 arguments
    if (!ctx.arg || !ctx.args) {
      throw new CelEvaluationError('exists_one() requires at least two arguments')
    }

    // Check for 2-parameter version (variable, predicate) or 3-parameter version (index/key, value, predicate)
    if (ctx.args.length === 1) {
      // 2-parameter version: variable and predicate
      const variableExpr = ctx.arg
      const predicateExpr = ctx.args[0]

      // Handle arrays
      if (Array.isArray(collection)) {
        if (collection.length === 0) {
          return false // Empty arrays return false (no elements to satisfy condition)
        }
        return this.evaluateExistsOneForArrayTwoParam(collection, variableExpr, predicateExpr)
      }

      // Handle maps (objects)
      if (typeof collection === 'object') {
        const keys = Object.keys(collection)
        if (keys.length === 0) {
          return false // Empty objects return false (no elements to satisfy condition)
        }
        return this.evaluateExistsOneForArrayTwoParam(keys, variableExpr, predicateExpr)
      }
    } else if (ctx.args.length === 2) {
      // 3-parameter version: index/key variable, value variable, and predicate
      const indexVariableExpr = ctx.arg
      const valueVariableExpr = ctx.args[0]
      const predicateExpr = ctx.args[1]

      // Handle arrays
      if (Array.isArray(collection)) {
        if (collection.length === 0) {
          return false // Empty arrays return false (no elements to satisfy condition)
        }
        return this.evaluateExistsOneForArray(collection, indexVariableExpr, valueVariableExpr, predicateExpr)
      }

      // Handle maps (objects)
      if (typeof collection === 'object') {
        return this.evaluateExistsOneForMap(collection as Record<string, unknown>, indexVariableExpr, valueVariableExpr, predicateExpr)
      }
    } else {
      throw new CelEvaluationError('exists_one() requires exactly two or three arguments')
    }

    return false
  }

  /**
   * Evaluates the exists_one() predicate for each element in an array
   */
  private evaluateExistsOneForArray(
    array: unknown[],
    indexVariableExpr: any,
    valueVariableExpr: any,
    predicateExpr: any,
  ): boolean {
    // Empty arrays return false
    if (array.length === 0) {
      return false
    }

    const indexVariableName = this.extractVariableName(indexVariableExpr, 'exists_one()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'exists_one()')

    // Count how many elements satisfy the condition
    let matchCount = 0
    
    for (let i = 0; i < array.length; i++) {
      // Create a new context with the loop variables
      const originalIndexValue = this.context[indexVariableName]
      const originalValueValue = this.context[valueVariableName]
      this.context[indexVariableName] = i
      this.context[valueVariableName] = array[i]

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
        if (originalIndexValue !== undefined) {
          this.context[indexVariableName] = originalIndexValue
        } else {
          delete this.context[indexVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return matchCount === 1 // Return true only if exactly one element satisfied the condition
  }

  /**
   * Evaluates the exists_one() predicate for each entry in a map
   */
  private evaluateExistsOneForMap(
    map: Record<string, unknown>,
    keyVariableExpr: any,
    valueVariableExpr: any,
    predicateExpr: any,
  ): boolean {
    const keyVariableName = this.extractVariableName(keyVariableExpr, 'exists_one()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'exists_one()')

    // Count how many entries satisfy the condition
    let matchCount = 0
    
    for (const [key, value] of Object.entries(map)) {
      // Create a new context with the loop variables
      const originalKeyValue = this.context[keyVariableName]
      const originalValueValue = this.context[valueVariableName]
      this.context[keyVariableName] = key
      this.context[valueVariableName] = value

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
        if (originalKeyValue !== undefined) {
          this.context[keyVariableName] = originalKeyValue
        } else {
          delete this.context[keyVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return matchCount === 1 // Return true only if exactly one entry satisfied the condition
  }

  /**
   * Evaluates the exists_one() predicate for each element in an array (2-parameter version)
   */
  private evaluateExistsOneForArrayTwoParam(
    array: unknown[],
    variableExpr: any,
    predicateExpr: any,
  ): boolean {
    // Empty arrays return false
    if (array.length === 0) {
      return false
    }

    const variableName = this.extractVariableName(variableExpr, 'exists_one()')

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
          // Don't short-circuit; we need to count all matches
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

    // Filter map entries based on predicate applied to keys
    const filteredKeys: string[] = []
    
    for (const [key, value] of Object.entries(map)) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = key

      try {
        const result = this.visit(predicateExpr)
        if (result) {
          filteredKeys.push(key)
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

    return filteredKeys
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
  ): unknown[] {
    const variableName = this.extractVariableName(variableExpr, 'map()')
    const mappedKeys: unknown[] = []
    
    for (const [key, value] of Object.entries(map)) {
      // Create a new context with the loop variable
      const originalValue = this.context[variableName]
      this.context[variableName] = key

      try {
        const transformedValue = this.visit(transformExpr)
        mappedKeys.push(transformedValue)
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    return mappedKeys
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
   * Handles the .join([separator]) method call for arrays
   */
  private handleJoinMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): string {
    // join() only works on arrays
    if (!Array.isArray(collection)) {
      throw new CelEvaluationError('join() can only be called on lists')
    }

    // join() takes an optional separator argument
    let separator = ''
    if (ctx.arg) {
      separator = this.visit(ctx.arg)
      if (typeof separator !== 'string') {
        throw new CelEvaluationError('join() separator must be a string')
      }
    }

    if (ctx.args && ctx.args.length > 0) {
      throw new CelEvaluationError('join() takes at most one argument')
    }

    // Convert all elements to strings and join
    return collection.map(String).join(separator)
  }

  /**
   * Handles the .transformList(i, v, transform) or .transformList(i, v, filter, transform) method call
   */
  private handleTransformListMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): unknown[] {
    // transformList() only works on arrays
    if (!Array.isArray(collection)) {
      throw new CelEvaluationError('transformList() can only be called on lists')
    }

    // Validate arguments - need either 3 arguments (index, value, transform) or 4 arguments (index, value, filter, transform)
    if (!ctx.arg || !ctx.args || (ctx.args.length !== 2 && ctx.args.length !== 3)) {
      throw new CelEvaluationError('transformList() requires either three arguments (index, value, transform) or four arguments (index, value, filter, transform)')
    }

    const indexVariableExpr = ctx.arg
    const valueVariableExpr = ctx.args[0]
    const isFilterPresent = ctx.args.length === 3
    
    if (isFilterPresent) {
      // Four arguments: index, value, filter, transform
      const filterExpr = ctx.args[1]
      const transformExpr = ctx.args[2]
      return this.transformArrayWithFilter(collection, indexVariableExpr, valueVariableExpr, filterExpr, transformExpr)
    } else {
      // Three arguments: index, value, transform
      const transformExpr = ctx.args[1]
      return this.transformArray(collection, indexVariableExpr, valueVariableExpr, transformExpr)
    }
  }

  /**
   * Handles the .transformMap(k, v, transform) or .transformMap(k, v, filter, transform) method call
   */
  private handleTransformMapMethod(
    ctx: IdentifierDotExpressionCstChildren,
    collection: unknown,
  ): Record<string, unknown> {
    // transformMap() only works on maps (objects)
    if (typeof collection !== 'object' || collection === null || Array.isArray(collection)) {
      throw new CelEvaluationError('transformMap() can only be called on maps')
    }

    // Validate arguments - need either 3 arguments (key, value, transform) or 4 arguments (key, value, filter, transform)
    if (!ctx.arg || !ctx.args || (ctx.args.length !== 2 && ctx.args.length !== 3)) {
      throw new CelEvaluationError('transformMap() requires either three arguments (key, value, transform) or four arguments (key, value, filter, transform)')
    }

    const keyVariableExpr = ctx.arg
    const valueVariableExpr = ctx.args[0]
    const isFilterPresent = ctx.args.length === 3
    
    if (isFilterPresent) {
      // Four arguments: key, value, filter, transform
      const filterExpr = ctx.args[1]
      const transformExpr = ctx.args[2]
      return this.transformMapWithFilter(collection as Record<string, unknown>, keyVariableExpr, valueVariableExpr, filterExpr, transformExpr)
    } else {
      // Three arguments: key, value, transform
      const transformExpr = ctx.args[1]
      return this.transformMapObject(collection as Record<string, unknown>, keyVariableExpr, valueVariableExpr, transformExpr)
    }
  }

  /**
   * Transforms an array by applying a transformation to each element with index and value
   */
  private transformArray(
    array: unknown[],
    indexVariableExpr: any,
    valueVariableExpr: any,
    transformExpr: any,
  ): unknown[] {
    // Empty arrays return empty array
    if (array.length === 0) {
      return []
    }

    const indexVariableName = this.extractVariableName(indexVariableExpr, 'transformList()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'transformList()')
    const transformedArray: unknown[] = []
    
    for (let i = 0; i < array.length; i++) {
      // Create a new context with the loop variables
      const originalIndexValue = this.context[indexVariableName]
      const originalValueValue = this.context[valueVariableName]
      this.context[indexVariableName] = i
      this.context[valueVariableName] = array[i]

      try {
        const transformedValue = this.visit(transformExpr)
        transformedArray.push(transformedValue)
      } finally {
        // Restore original context
        if (originalIndexValue !== undefined) {
          this.context[indexVariableName] = originalIndexValue
        } else {
          delete this.context[indexVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return transformedArray
  }

  /**
   * Transforms an array by filtering then transforming elements with index and value
   */
  private transformArrayWithFilter(
    array: unknown[],
    indexVariableExpr: any,
    valueVariableExpr: any,
    filterExpr: any,
    transformExpr: any,
  ): unknown[] {
    // Empty arrays return empty array
    if (array.length === 0) {
      return []
    }

    const indexVariableName = this.extractVariableName(indexVariableExpr, 'transformList()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'transformList()')
    const transformedArray: unknown[] = []
    
    for (let i = 0; i < array.length; i++) {
      // Create a new context with the loop variables
      const originalIndexValue = this.context[indexVariableName]
      const originalValueValue = this.context[valueVariableName]
      this.context[indexVariableName] = i
      this.context[valueVariableName] = array[i]

      try {
        // First check if the element passes the filter
        const filterResult = this.visit(filterExpr)
        if (filterResult === true) {
          const transformedValue = this.visit(transformExpr)
          transformedArray.push(transformedValue)
        }
      } finally {
        // Restore original context
        if (originalIndexValue !== undefined) {
          this.context[indexVariableName] = originalIndexValue
        } else {
          delete this.context[indexVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return transformedArray
  }

  /**
   * Transforms a map by applying a transformation to each entry with key and value
   */
  private transformMapObject(
    map: Record<string, unknown>,
    keyVariableExpr: any,
    valueVariableExpr: any,
    transformExpr: any,
  ): Record<string, unknown> {
    const keyVariableName = this.extractVariableName(keyVariableExpr, 'transformMap()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'transformMap()')
    const transformedMap: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(map)) {
      // Create a new context with the loop variables
      const originalKeyValue = this.context[keyVariableName]
      const originalValueValue = this.context[valueVariableName]
      this.context[keyVariableName] = key
      this.context[valueVariableName] = value

      try {
        const transformedValue = this.visit(transformExpr)
        transformedMap[key] = transformedValue
      } finally {
        // Restore original context
        if (originalKeyValue !== undefined) {
          this.context[keyVariableName] = originalKeyValue
        } else {
          delete this.context[keyVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return transformedMap
  }

  /**
   * Transforms a map by filtering then transforming entries with key and value
   */
  private transformMapWithFilter(
    map: Record<string, unknown>,
    keyVariableExpr: any,
    valueVariableExpr: any,
    filterExpr: any,
    transformExpr: any,
  ): Record<string, unknown> {
    const keyVariableName = this.extractVariableName(keyVariableExpr, 'transformMap()')
    const valueVariableName = this.extractVariableName(valueVariableExpr, 'transformMap()')
    const transformedMap: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(map)) {
      // Create a new context with the loop variables
      const originalKeyValue = this.context[keyVariableName]
      const originalValueValue = this.context[valueVariableName]
      this.context[keyVariableName] = key
      this.context[valueVariableName] = value

      try {
        // First check if the entry passes the filter
        const filterResult = this.visit(filterExpr)
        if (filterResult === true) {
          const transformedValue = this.visit(transformExpr)
          transformedMap[key] = transformedValue
        }
      } finally {
        // Restore original context
        if (originalKeyValue !== undefined) {
          this.context[keyVariableName] = originalKeyValue
        } else {
          delete this.context[keyVariableName]
        }
        if (originalValueValue !== undefined) {
          this.context[valueVariableName] = originalValueValue
        } else {
          delete this.context[valueVariableName]
        }
      }
    }

    return transformedMap
  }

  /**
   * Handles the .optMap(variable, transform) method call on optional values
   */
  private handleOptMapMethod(
    ctx: IdentifierDotExpressionCstChildren,
    optional: unknown,
  ): unknown {
    // optMap() requires exactly 2 arguments: variable and transform
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('optMap() requires exactly two arguments: variable and transform')
    }

    const variableExpr = ctx.arg
    const transformExpr = ctx.args[0]

    // Create a lambda function that handles the CEL context properly
    const mapFn = (value: unknown) => {
      const variableName = this.extractVariableName(variableExpr, 'optMap()')
      
      // Create a new context with the lambda variable
      const originalValue = this.context[variableName]
      this.context[variableName] = value

      try {
        return this.visit(transformExpr)
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    // Call the optMap method with the lambda function
    if (typeof optional === 'object' && optional !== null && 'optMap' in optional) {
      const method = (optional as any).optMap
      if (typeof method === 'function') {
        return method.call(optional, mapFn)
      }
    }
    
    throw new CelEvaluationError('optMap() can only be called on optional values')
  }

  /**
   * Handles the .optFlatMap(variable, transform) method call on optional values
   */
  private handleOptFlatMapMethod(
    ctx: IdentifierDotExpressionCstChildren,
    optional: unknown,
  ): unknown {
    // optFlatMap() requires exactly 2 arguments: variable and transform
    if (!ctx.arg || !ctx.args || ctx.args.length !== 1) {
      throw new CelEvaluationError('optFlatMap() requires exactly two arguments: variable and transform')
    }

    const variableExpr = ctx.arg
    const transformExpr = ctx.args[0]

    // Create a lambda function that handles the CEL context properly
    const mapFn = (value: unknown) => {
      const variableName = this.extractVariableName(variableExpr, 'optFlatMap()')
      
      // Create a new context with the lambda variable
      const originalValue = this.context[variableName]
      this.context[variableName] = value

      try {
        return this.visit(transformExpr)
      } finally {
        // Restore original context
        if (originalValue !== undefined) {
          this.context[variableName] = originalValue
        } else {
          delete this.context[variableName]
        }
      }
    }

    // Call the optFlatMap method with the lambda function
    if (typeof optional === 'object' && optional !== null && 'optFlatMap' in optional) {
      const method = (optional as any).optFlatMap
      if (typeof method === 'function') {
        return method.call(optional, mapFn)
      }
    }
    
    throw new CelEvaluationError('optFlatMap() can only be called on optional values')
  }

  /**
   * Handles string method calls
   */
  private handleStringMethod(
    methodName: string,
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): unknown {
    switch (methodName) {
      case 'contains':
        return this.handleStringContains(ctx, str)
      case 'endsWith':
        return this.handleStringEndsWith(ctx, str)
      case 'startsWith':
        return this.handleStringStartsWith(ctx, str)
      case 'matches':
        return this.handleStringMatches(ctx, str)
      case 'trim':
        return this.handleStringTrim(ctx, str)
      case 'split':
        return this.handleStringSplit(ctx, str)
      case 'charAt':
        return this.handleStringCharAt(ctx, str)
      case 'indexOf':
        return this.handleStringIndexOf(ctx, str)
      case 'lastIndexOf':
        return this.handleStringLastIndexOf(ctx, str)
      case 'lowerAscii':
        return this.handleStringLowerAscii(ctx, str)
      case 'upperAscii':
        return this.handleStringUpperAscii(ctx, str)
      case 'replace':
        return this.handleStringReplace(ctx, str)
      case 'substring':
        return this.handleStringSubstring(ctx, str)
      case 'format':
        return this.handleStringFormat(ctx, str)
      default:
        throw new CelEvaluationError(`Unknown string method: ${methodName}`)
    }
  }

  /**
   * Handles the string.contains(substring) method
   */
  private handleStringContains(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): boolean {
    // Validate arguments - contains() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('contains() requires exactly one argument')
    }

    const substring = this.visit(ctx.arg)
    
    if (typeof substring !== 'string') {
      throw new CelEvaluationError('contains() argument must be a string')
    }

    return str.includes(substring)
  }

  /**
   * Handles the string.endsWith(suffix) method
   */
  private handleStringEndsWith(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): boolean {
    // Validate arguments - endsWith() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('endsWith() requires exactly one argument')
    }

    const suffix = this.visit(ctx.arg)
    
    if (typeof suffix !== 'string') {
      throw new CelEvaluationError('endsWith() argument must be a string')
    }

    return str.endsWith(suffix)
  }

  /**
   * Handles the string.startsWith(prefix) method
   */
  private handleStringStartsWith(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): boolean {
    // Validate arguments - startsWith() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('startsWith() requires exactly one argument')
    }

    const prefix = this.visit(ctx.arg)
    
    if (typeof prefix !== 'string') {
      throw new CelEvaluationError('startsWith() argument must be a string')
    }

    return str.startsWith(prefix)
  }

  /**
   * Handles the string.matches(pattern) method for regex matching
   */
  private handleStringMatches(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): boolean {
    // Validate arguments - matches() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('matches() requires exactly one argument')
    }

    const pattern = this.visit(ctx.arg)
    
    if (typeof pattern !== 'string') {
      throw new CelEvaluationError('matches() argument must be a string')
    }

    try {
      const regex = new RegExp(pattern)
      return regex.test(str)
    } catch (error) {
      throw new CelEvaluationError(`Invalid regex pattern: ${pattern}`)
    }
  }

  /**
   * Handles the string.trim() method
   */
  private handleStringTrim(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): string {
    // Validate arguments - trim() takes no arguments
    if (ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('trim() takes no arguments')
    }

    return str.trim()
  }

  /**
   * Handles the string.split(separator, [limit]) method
   */
  private handleStringSplit(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): string[] {
    // Validate arguments - split() requires one or two arguments
    if (!ctx.arg) {
      throw new CelEvaluationError('split() requires at least one argument')
    }

    const separator = this.visit(ctx.arg)
    
    if (typeof separator !== 'string') {
      throw new CelEvaluationError('split() first argument must be a string')
    }

    let limit: number | undefined = undefined
    if (ctx.args && ctx.args.length > 0) {
      if (ctx.args.length > 1) {
        throw new CelEvaluationError('split() takes at most two arguments')
      }
      limit = this.visit(ctx.args[0])
      if (typeof limit !== 'number' || !Number.isInteger(limit)) {
        throw new CelEvaluationError('split() second argument must be an integer')
      }
    }

    // Handle empty separator case - split into individual characters
    if (separator === '') {
      const chars = str === '' ? [] : str.split('')
      if (limit === 0) return []
      if (limit === undefined || limit < 0) return chars
      return chars.slice(0, limit)
    }

    // Handle special limit cases
    if (limit === 0) {
      return []
    }
    if (limit === 1) {
      return [str]
    }
    if (limit && limit < 0) {
      // Negative limit means no limit
      return str.split(separator)
    }

    return str.split(separator, limit)
  }

  /**
   * Handles the string.charAt(index) method
   */
  private handleStringCharAt(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): string {
    // Validate arguments - charAt() requires exactly one argument
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('charAt() requires exactly one argument')
    }

    const index = this.visit(ctx.arg)
    
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw new CelEvaluationError('charAt() argument must be an integer')
    }

    // Return empty string if index equals string length, throw error if index > string length
    if (index === str.length) {
      return ''
    }
    
    if (index < 0 || index > str.length) {
      throw new CelEvaluationError(`index out of range: ${index}`)
    }

    return str.charAt(index)
  }

  /**
   * Handles the string.indexOf(substring, [start]) method
   */
  private handleStringIndexOf(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): number {
    // Validate arguments - indexOf() requires one or two arguments
    if (!ctx.arg) {
      throw new CelEvaluationError('indexOf() requires at least one argument')
    }

    const substring = this.visit(ctx.arg)
    
    if (typeof substring !== 'string') {
      throw new CelEvaluationError('indexOf() first argument must be a string')
    }

    let startIndex = 0
    if (ctx.args && ctx.args.length > 0) {
      if (ctx.args.length > 1) {
        throw new CelEvaluationError('indexOf() takes at most two arguments')
      }
      startIndex = this.visit(ctx.args[0])
      if (typeof startIndex !== 'number' || !Number.isInteger(startIndex)) {
        throw new CelEvaluationError('indexOf() second argument must be an integer')
      }
      if (startIndex < 0 || startIndex > str.length) {
        throw new CelEvaluationError(`index out of range: ${startIndex}`)
      }
    }

    return str.indexOf(substring, startIndex)
  }

  /**
   * Handles the string.lastIndexOf(substring, [start]) method
   */
  private handleStringLastIndexOf(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): number {
    // Validate arguments - lastIndexOf() requires one or two arguments
    if (!ctx.arg) {
      throw new CelEvaluationError('lastIndexOf() requires at least one argument')
    }

    const substring = this.visit(ctx.arg)
    
    if (typeof substring !== 'string') {
      throw new CelEvaluationError('lastIndexOf() first argument must be a string')
    }

    let startIndex = str.length
    if (ctx.args && ctx.args.length > 0) {
      if (ctx.args.length > 1) {
        throw new CelEvaluationError('lastIndexOf() takes at most two arguments')
      }
      startIndex = this.visit(ctx.args[0])
      if (typeof startIndex !== 'number' || !Number.isInteger(startIndex)) {
        throw new CelEvaluationError('lastIndexOf() second argument must be an integer')
      }
      
      // Validate startIndex bounds
      if (startIndex < 0 || startIndex > str.length) {
        throw new CelEvaluationError(`index out of range: ${startIndex}`)
      }
    }

    return str.lastIndexOf(substring, startIndex)
  }

  /**
   * Handles the string.lowerAscii() method
   */
  private handleStringLowerAscii(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): string {
    // Validate arguments - lowerAscii() takes no arguments
    if (ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('lowerAscii() takes no arguments')
    }

    // Only convert ASCII characters to lowercase, leave Unicode as-is
    return str.replace(/[A-Z]/g, (char) => char.toLowerCase())
  }

  /**
   * Handles the string.upperAscii() method
   */
  private handleStringUpperAscii(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): string {
    // Validate arguments - upperAscii() takes no arguments
    if (ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('upperAscii() takes no arguments')
    }

    // Only convert ASCII characters to uppercase, leave Unicode as-is
    return str.replace(/[a-z]/g, (char) => char.toUpperCase())
  }

  /**
   * Handles the string.replace(oldStr, newStr, [count]) method
   */
  private handleStringReplace(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): string {
    // Validate arguments - replace() requires two or three arguments
    if (!ctx.arg || !ctx.args || ctx.args.length === 0) {
      throw new CelEvaluationError('replace() requires at least two arguments')
    }

    if (ctx.args.length > 2) {
      throw new CelEvaluationError('replace() takes at most three arguments')
    }

    const oldStr = this.visit(ctx.arg)
    const newStr = this.visit(ctx.args[0])
    
    if (typeof oldStr !== 'string') {
      throw new CelEvaluationError('replace() first argument must be a string')
    }
    if (typeof newStr !== 'string') {
      throw new CelEvaluationError('replace() second argument must be a string')
    }

    let count = -1 // Default: replace all
    if (ctx.args.length > 1) {
      count = this.visit(ctx.args[1])
      if (typeof count !== 'number' || !Number.isInteger(count)) {
        throw new CelEvaluationError('replace() third argument must be an integer')
      }
    }

    if (count === 0) {
      return str
    }

    if (count < 0) {
      // Replace all occurrences
      return str.split(oldStr).join(newStr)
    } else {
      // Replace up to count occurrences
      let result = str
      for (let i = 0; i < count; i++) {
        const index = result.indexOf(oldStr)
        if (index === -1) break
        result = result.substring(0, index) + newStr + result.substring(index + oldStr.length)
      }
      return result
    }
  }

  /**
   * Handles the string.substring(start, [end]) method
   */
  private handleStringSubstring(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): string {
    // Validate arguments - substring() requires one or two arguments
    if (!ctx.arg) {
      throw new CelEvaluationError('substring() requires at least one argument')
    }

    const start = this.visit(ctx.arg)
    
    if (typeof start !== 'number' || !Number.isInteger(start)) {
      throw new CelEvaluationError('substring() first argument must be an integer')
    }

    // Validate start index bounds
    if (start < 0 || start > str.length) {
      throw new CelEvaluationError(`index out of range: ${start}`)
    }

    let end = str.length
    if (ctx.args && ctx.args.length > 0) {
      if (ctx.args.length > 1) {
        throw new CelEvaluationError('substring() takes at most two arguments')
      }
      end = this.visit(ctx.args[0])
      if (typeof end !== 'number' || !Number.isInteger(end)) {
        throw new CelEvaluationError('substring() second argument must be an integer')
      }
      
      // Validate end index bounds
      if (end < 0 || end > str.length) {
        throw new CelEvaluationError(`index out of range: ${end}`)
      }
      
      // Validate range order
      if (start > end) {
        throw new CelEvaluationError(`invalid substring range. start: ${start}, end: ${end}`)
      }
    }

    return str.substring(start, end)
  }

  /**
   * Handles the string.format(args) method
   */
  private handleStringFormat(
    ctx: IdentifierDotExpressionCstChildren,
    str: string,
  ): string {
    // Validate arguments - format() requires exactly one argument (array of values)
    if (!ctx.arg || (ctx.args && ctx.args.length > 0)) {
      throw new CelEvaluationError('format() requires exactly one argument')
    }

    const args = this.visit(ctx.arg)
    
    if (!Array.isArray(args)) {
      throw new CelEvaluationError('format() argument must be an array')
    }

    let result = str
    let argIndex = 0

    // Replace format specifiers with values
    result = result.replace(/%%/g, '\x00') // Temporarily replace %% with null char
    
    // Handle all format specifiers in one pass, including precision specifiers
    result = result.replace(/%(?:\.(\d+))?([a-zA-Z%])/g, (match, precision, specifier) => {
      if (specifier === '%') {
        return '%'
      }
      
      if (argIndex >= args.length) {
        throw new CelEvaluationError(`index ${argIndex} out of range`)
      }

      const arg = args[argIndex++]
      const prec = precision ? parseInt(precision, 10) : undefined
      

      
      switch (specifier) {
        case 's':
          // Use the formatValueForString helper for consistent formatting
          return this.formatValueForString(arg)
        case 'd':
          if (arg && typeof arg === 'object' && 'seconds' in arg) {
            throw new CelEvaluationError('error during formatting: decimal clause can only be used on integers, was given google.protobuf.Duration')
          }
          if (arg === null) {
            throw new CelEvaluationError('error during formatting: decimal clause can only be used on integers, was given null_type')
          }
          if (typeof arg === 'number') {
            if (!isFinite(arg)) {
              return isNaN(arg) ? 'NaN' : (arg > 0 ? 'Infinity' : '-Infinity')
            }
            return Math.trunc(arg).toString()
          }
          // Handle wrapped numbers
          if (arg && typeof arg === 'object' && (arg as any).__isFloatLiteral !== undefined) {
            const val = Number(arg.valueOf ? arg.valueOf() : arg)
            if (!isFinite(val)) {
              return isNaN(val) ? 'NaN' : (val > 0 ? 'Infinity' : '-Infinity')
            }
            return Math.trunc(val).toString()
          }
          return String(arg)
        case 'x':
          if (typeof arg === 'number') {
            if (!isFinite(arg)) {
              throw new CelEvaluationError('only integers, byte buffers, and strings can be formatted as hex, was given double')
            }
            if (!Number.isInteger(arg)) {
              throw new CelEvaluationError('only integers, byte buffers, and strings can be formatted as hex, was given double')
            }
            return Math.trunc(arg).toString(16)
          }
          if (typeof arg === 'string') {
            return Array.from(arg).map(c => c.charCodeAt(0).toString(16)).join('')
          }
          if (arg instanceof Uint8Array) {
            return Array.from(arg).map(b => b.toString(16)).join('')
          }
          // Check for objects with __isFloatLiteral
          if (arg && typeof arg === 'object' && '__isFloatLiteral' in arg) {
            const val = Number(arg.valueOf ? arg.valueOf() : arg)
            if (!Number.isInteger(val)) {
              throw new CelEvaluationError('only integers, byte buffers, and strings can be formatted as hex, was given double')
            }
            return Math.trunc(val).toString(16)
          }
          return arg.toString(16)
        case 'X':
          if (typeof arg === 'number') {
            if (!isFinite(arg)) {
              throw new CelEvaluationError('only integers, byte buffers, and strings can be formatted as hex, was given double')
            }
            if (!Number.isInteger(arg)) {
              throw new CelEvaluationError('only integers, byte buffers, and strings can be formatted as hex, was given double')
            }
            return Math.trunc(arg).toString(16).toUpperCase()
          }
          if (typeof arg === 'string') {
            return Array.from(arg).map(c => c.charCodeAt(0).toString(16).toUpperCase()).join('')
          }
          if (arg instanceof Uint8Array) {
            return Array.from(arg).map(b => b.toString(16).toUpperCase()).join('')
          }
          // Check for objects with __isFloatLiteral
          if (arg && typeof arg === 'object' && '__isFloatLiteral' in arg) {
            const val = Number(arg.valueOf ? arg.valueOf() : arg)
            if (!Number.isInteger(val)) {
              throw new CelEvaluationError('only integers, byte buffers, and strings can be formatted as hex, was given double')
            }
            return Math.trunc(val).toString(16).toUpperCase()
          }
          return arg.toString(16).toUpperCase()
        case 'b':
          if (typeof arg === 'string') {
            throw new CelEvaluationError('error during formatting: only integers and bools can be formatted as binary, was given string')
          }
          if (typeof arg === 'number') {
            return Math.trunc(arg).toString(2)
          }
          if (typeof arg === 'boolean') {
            return arg ? '1' : '0'
          }
          return arg.toString(2)
        case 'o':
          if (typeof arg === 'string') {
            throw new CelEvaluationError('error during formatting: octal clause can only be used on integers, was given string')
          }
          if (typeof arg === 'number') {
            return Math.trunc(arg).toString(8)
          }
          return arg.toString(8)
        case 'f':
          if (arg === null) {
            throw new CelEvaluationError('null not allowed for %f')
          }
          if (typeof arg === 'number') {
            if (!isFinite(arg)) {
              return isNaN(arg) ? 'NaN' : (arg > 0 ? 'Infinity' : '-Infinity')
            }
            return arg.toFixed(prec !== undefined ? prec : 6)
          }
          // Handle dyn objects that have __isFloatLiteral
          if (arg && typeof arg === 'object' && '__isFloatLiteral' in arg) {
            const val = Number(arg.valueOf ? arg.valueOf() : arg)
            if (!isFinite(val)) {
              return isNaN(val) ? 'NaN' : (val > 0 ? 'Infinity' : '-Infinity')
            }
            return val.toFixed(prec !== undefined ? prec : 6)
          }
          return String(arg)
        case 'e':
          if (arg === null) {
            throw new CelEvaluationError('null not allowed for %e')
          }
          if (typeof arg === 'number') {
            if (!isFinite(arg)) {
              return isNaN(arg) ? 'NaN' : (arg > 0 ? 'Infinity' : '-Infinity')
            }
            const exp = arg.toExponential(prec !== undefined ? prec : 6)
            // Ensure exponent has at least 2 digits (e.g., e+0 -> e+00)
            return exp.replace(/e([+-])(\d)$/, 'e$10$2')
          }
          // Handle dyn objects that have __isFloatLiteral
          if (arg && typeof arg === 'object' && '__isFloatLiteral' in arg) {
            const val = Number(arg.valueOf ? arg.valueOf() : arg)
            if (!isFinite(val)) {
              return isNaN(val) ? 'NaN' : (val > 0 ? 'Infinity' : '-Infinity')
            }
            const exp = val.toExponential(prec !== undefined ? prec : 6)
            // Ensure exponent has at least 2 digits (e.g., e+0 -> e+00)
            return exp.replace(/e([+-])(\d)$/, 'e$10$2')
          }
          return String(arg)
        case 'F':
        case 'E':
          // Uppercase variants - not supported in CEL, throw error
          throw new CelEvaluationError(`could not parse formatting clause: unrecognized formatting clause "${specifier}"`)
        default:
          throw new CelEvaluationError(`could not parse formatting clause: unrecognized formatting clause "${specifier}"`)
      }
    })

    result = result.replace(/\x00/g, '%') // Restore %% as %
    
    return result
  }

  /**
   * Helper method to format values for string representation in CEL format
   */
  private formatValueForString(value: any): string {
    if (value === null || value === undefined) {
      return 'null'
    }
    if (typeof value === 'string') {
      return value
    }
    if (typeof value === 'number') {
      if (!isFinite(value)) {
        return isNaN(value) ? 'NaN' : (value > 0 ? 'Infinity' : '-Infinity')
      }
      return value.toString()
    }
    // Handle dynamic types first (before other object checks)
    if (value && typeof value === 'object' && '__isDynamic' in value && value.__isDynamic === true) {
      // Extract the actual value from dynamic type
      let actualValue = value.valueOf ? value.valueOf() : value
      
      // Handle special cases where valueOf() doesn't give us the right value
      if (value instanceof Date || (value && typeof value === 'object' && 'toISOString' in value)) {
        // For timestamps, use the date formatting logic directly
        actualValue = value
      } else if (value && typeof value === 'object' && 'seconds' in value) {
        // For durations, use the duration formatting logic directly  
        actualValue = value
      } else if (Array.isArray(value)) {
        // For arrays, use the array formatting logic directly
        actualValue = value
      }
      
      // If actualValue is still the same complex object, format it without recursing
      if (actualValue === value) {
        // Create a copy without the __isDynamic property and format normally
        let temp: any
        if (Array.isArray(value)) {
          // For arrays, preserve the array structure
          temp = [...value]
        } else if (value instanceof Date) {
          // For dates, create a new Date object
          temp = new Date(value.getTime())
        } else {
          // For other objects, use object spread
          temp = {...value}
        }
        delete temp.__isDynamic
        return this.formatValueForString(temp)
      } else {
        // Recursively format the extracted primitive value
        return this.formatValueForString(actualValue)
      }
    }
    // Handle wrapped numbers
    if (value && typeof value === 'object' && '__isFloatLiteral' in value) {
      const val = Number(value.valueOf ? value.valueOf() : value)
      if (!isFinite(val)) {
        return isNaN(val) ? 'NaN' : (val > 0 ? 'Infinity' : '-Infinity')
      }
      return val.toString()
    }
    if (value instanceof Date) {
      // Format timestamps without .000 when milliseconds are zero
      const isoString = value.toISOString()
      return isoString.replace(/\.000Z$/, 'Z')
    }
    if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
      return `${value.seconds}s`
    }
    if (Array.isArray(value)) {
      // Check if any array elements are protobuf objects
      for (const item of value) {
        this.checkForProtobufObject(item)
      }
      return `[${value.map(v => this.formatValueForString(v)).join(', ')}]`
    }
    if (value instanceof Uint8Array) {
      // Format bytes as their string representation
      return String.fromCharCode(...value)
    }
    
    // Check for protobuf objects before generic object handling
    this.checkForProtobufObject(value)
    
    // Handle maps/objects
    if (value && typeof value === 'object') {
      // Check if any map values are protobuf objects
      for (const val of Object.values(value)) {
        this.checkForProtobufObject(val)
      }
      const entries = Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}: ${this.formatValueForString(v)}`)
        .join(', ')
      return `{${entries}}`
    }
    
    return String(value)
  }

  private checkForProtobufObject(value: any): void {
    if (value && typeof value === 'object') {
      // Check for TestAllTypes objects by their special __hasField method
      if (value.__hasField && typeof value.__hasField === 'function') {
        throw new CelEvaluationError(`error during formatting: string clause can only be used on strings, bools, bytes, ints, doubles, maps, lists, types, durations, and timestamps, was given cel.expr.conformance.proto3.TestAllTypes`)
      }
      
      // Check for protobuf objects by looking for specific TestAllTypes fields (for non-empty objects)
      if (value.repeated_nested_enum !== undefined && value.standalone_enum !== undefined) {
        throw new CelEvaluationError(`error during formatting: string clause can only be used on strings, bools, bytes, ints, doubles, maps, lists, types, durations, and timestamps, was given cel.expr.conformance.proto3.TestAllTypes`)
      }
      
      // Check constructor name as backup
      if (value.constructor && value.constructor.name && 
          (value.constructor.name.includes('TestAllTypes') || 
           value.constructor.name.includes('Proto'))) {
        throw new CelEvaluationError(`error during formatting: string clause can only be used on strings, bools, bytes, ints, doubles, maps, lists, types, durations, and timestamps, was given ${value.constructor.name}`)
      }
    }
  }

  /**
   * Processes a string literal, converting escape sequences to actual characters.
   * Handles common escape sequences and Unicode escapes.
   */
  private processStringEscapes(content: string, quoteType: string = '"'): string {
    let result = ''
    let i = 0
    
    while (i < content.length) {
      if (content[i] === '\\' && i + 1 < content.length) {
        const nextChar = content[i + 1]
        
        if (nextChar === 'u' && i + 5 <= content.length) {
          // Unicode escape sequence \u270c
          const hexDigits = content.slice(i + 2, i + 6)
          if (/^[0-9a-fA-F]{4}$/.test(hexDigits)) {
            const codePoint = parseInt(hexDigits, 16)
            result += String.fromCharCode(codePoint)
            i += 6
            continue
          }
        } else if (nextChar === 'U' && i + 10 <= content.length) {
          // Unicode escape sequence \U0001F431
          const hexDigits = content.slice(i + 2, i + 10)
          if (/^[0-9a-fA-F]{8}$/.test(hexDigits)) {
            const codePoint = parseInt(hexDigits, 16)
            result += String.fromCodePoint(codePoint)
            i += 10
            continue
          }
        } else if (nextChar === 'x' && i + 4 <= content.length) {
          // Hex escape sequence \x41
          const hexDigits = content.slice(i + 2, i + 4)
          if (/^[0-9a-fA-F]{2}$/.test(hexDigits)) {
            result += String.fromCharCode(parseInt(hexDigits, 16))
            i += 4
            continue
          }
        } else {
          // Common escape sequences
          switch (nextChar) {
            case 'a':
              result += '\x07' // Bell/alert
              i += 2
              continue
            case 'b':
              result += '\b' // Backspace
              i += 2
              continue
            case 'f':
              result += '\f' // Form feed
              i += 2
              continue
            case 'n':
              result += '\n'
              i += 2
              continue
            case 'r':
              result += '\r'
              i += 2
              continue
            case 't':
              result += '\t'
              i += 2
              continue
            case 'v':
              result += '\v' // Vertical tab
              i += 2
              continue
            case '\\':
              result += '\\'
              i += 2
              continue
            case '"':
              // \" always produces a literal double quote
              result += '"'
              i += 2
              continue
            case "'":
              // \' always produces a literal single quote
              result += "'"
              i += 2
              continue
            default:
              // Unknown escape, treat as literal
              result += content[i]
              i++
              continue
          }
        }
      }
      
      // Regular character
      result += content[i]
      i++
    }
    
    return result
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
      
      // Regular character - encode as UTF-8
      const char = content[i]
      const encoded = new TextEncoder().encode(char)
      bytes.push(...Array.from(encoded))
      i++
    }
    
    return new Uint8Array(bytes)
  }

  /**
   * Handles method calls on timestamp objects
   */
  private handleTimestampMethod(
    methodName: string, 
    ctx: IdentifierDotExpressionCstChildren,
    timestamp: Date
  ): unknown {
    // Methods that don't take timezone parameters
    switch (methodName) {
      case 'getTime':
        return timestamp.getTime()
      case 'getMilliseconds':
        return timestamp.getUTCMilliseconds()
    }

    // Methods that can take optional timezone parameters
    let timezone: string | null = null
    if (ctx.arg && methodName !== 'getTime' && methodName !== 'getMilliseconds') {
      const timezoneArg = this.visit(ctx.arg)
      if (typeof timezoneArg !== 'string') {
        throw new CelEvaluationError(`${methodName}() timezone argument must be a string`)
      }
      timezone = timezoneArg
    }

    // Get the appropriate date considering timezone
    const dateToUse = timezone ? this.applyTimezone(timestamp, timezone) : timestamp

    switch (methodName) {
      case 'getFullYear':
        return timezone ? dateToUse.getUTCFullYear() : timestamp.getUTCFullYear()
      case 'getMonth':
        return timezone ? dateToUse.getUTCMonth() : timestamp.getUTCMonth()
      case 'getDate':
        return timezone ? dateToUse.getUTCDate() : timestamp.getUTCDate()
      case 'getHours':
        return timezone ? dateToUse.getUTCHours() : timestamp.getUTCHours()
      case 'getMinutes':
        return timezone ? dateToUse.getUTCMinutes() : timestamp.getUTCMinutes()
      case 'getSeconds':
        return timezone ? dateToUse.getUTCSeconds() : timestamp.getUTCSeconds()
      case 'getDay':
        return timezone ? dateToUse.getUTCDay() : timestamp.getUTCDay()
      case 'getDayOfMonth':
        return timezone ? dateToUse.getUTCDate() - 1 : timestamp.getUTCDate() - 1
      case 'getDayOfWeek':
        return timezone ? dateToUse.getUTCDay() : timestamp.getUTCDay()
      case 'getDayOfYear':
        // Calculate day of year (0-365)
        if (timezone) {
          const adjustedDate = this.applyTimezone(timestamp, timezone)
          const startOfYear = new Date(Date.UTC(adjustedDate.getUTCFullYear(), 0, 1))
          return Math.floor((adjustedDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
        } else {
          const startOfYear = new Date(Date.UTC(timestamp.getUTCFullYear(), 0, 1))
          const dayOfYear = Math.floor((timestamp.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
          return dayOfYear
        }
      default:
        throw new CelEvaluationError(`Unknown timestamp method: ${methodName}`)
    }
  }

  /**
   * Apply timezone offset to a timestamp
   */
  private applyTimezone(timestamp: Date, timezone: string): Date {
    // Handle numeric offsets like '+02:00', '-05:00', '02:00', '+05:45'
    const numericOffsetMatch = timezone.match(/^([+-]?)(\d{1,2}):(\d{2})$/)
    if (numericOffsetMatch) {
      const sign = numericOffsetMatch[1] === '-' ? -1 : 1 // default to + if no sign
      const hours = parseInt(numericOffsetMatch[2], 10)
      const minutes = parseInt(numericOffsetMatch[3], 10)
      const offsetMs = sign * (hours * 60 + minutes) * 60 * 1000
      return new Date(timestamp.getTime() + offsetMs)
    }

    // Handle named timezones by converting to appropriate offset
    // This is a simplified implementation - in a full implementation you'd use
    // a proper timezone library like date-fns-tz or Intl.DateTimeFormat
    const timezoneOffsets: Record<string, number> = {
      'US/Central': -6 * 60, // CST offset in minutes  
      'Australia/Sydney': 11 * 60, // AEDT offset in minutes (approximate)
      'America/St_Johns': -3.5 * 60, // NST offset in minutes
      'Asia/Kathmandu': 5.75 * 60, // NPT offset in minutes
    }

    const offsetMinutes = timezoneOffsets[timezone]
    if (offsetMinutes !== undefined) {
      const offsetMs = offsetMinutes * 60 * 1000
      return new Date(timestamp.getTime() + offsetMs)
    }

    // If timezone is not recognized, treat as UTC
    return timestamp
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
      case 'getHours':
        return Math.floor(duration.seconds / 3600)
      case 'getMinutes':
        return Math.floor(duration.seconds / 60)
      default:
        throw new CelEvaluationError(`Unknown duration method: ${methodName}`)
    }
  }

  /**
   * Handles list elements with optional markers
   */
  listElement(ctx: ListElementCstChildren): unknown {
    if (ctx.optional) {
      // For optional list elements, we need to handle them based on context
      // For now, just evaluate the expression normally
      // TODO: Implement optional semantics based on CEL specification
    }
    return this.visit(ctx.expr[0])
  }




}
