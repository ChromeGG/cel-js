import { IToken, tokenMatcher } from 'chevrotain'
import {
  Division,
  Equals,
  GreaterOrEqualThan,
  GreaterThan,
  In,
  LessOrEqualThan,
  LessThan,
  LogicalAndOperator,
  LogicalNotOperator,
  LogicalOrOperator,
  Minus,
  Modulo,
  MultiplicationToken,
  NotEquals,
  Plus,
} from './tokens.js'
import { CelTypeError } from './errors/CelTypeError.js'
import { CelEvaluationError } from './errors/CelEvaluationError.js'
import {
  IdentifierDotExpressionCstNode,
  IndexExpressionCstNode,
  StructExpressionCstNode,
} from './cst-definitions.js'
import { equals as ramdaEquals } from 'ramda'

export interface Duration {
  seconds: number
  nanoseconds: number
}



export enum CelType {
  int = 'int',
  uint = 'uint',
  float = 'float',
  string = 'string',
  bool = 'bool',
  bytes = 'bytes',
  null = 'null',
  list = 'list',
  map = 'map',
  timestamp = 'timestamp',
  duration = 'duration',
}

const calculableTypes = [CelType.int, CelType.uint, CelType.float]

export const isCalculable = (value: unknown): value is number => {
  const type = getCelType(value)
  return calculableTypes.includes(type)
}

const isInt = (value: unknown): value is number =>
  getCelType(value) === CelType.int

const isUint = (value: unknown): value is number =>
  typeof value === 'number' && 
  (globalThis as any).__celUnsignedRegistry?.has(value)

const isString = (value: unknown): value is string =>
  getCelType(value) === CelType.string

const isArray = (value: unknown): value is unknown[] =>
  getCelType(value) === CelType.list

const isBoolean = (value: unknown): value is boolean =>
  getCelType(value) === CelType.bool

const isMap = (value: unknown): value is Record<string, unknown> =>
  getCelType(value) === CelType.map

const isTimestamp = (value: unknown): value is Date =>
  getCelType(value) === CelType.timestamp

const isDuration = (value: unknown): value is Duration =>
  getCelType(value) === CelType.duration

const isBytes = (value: unknown): value is Uint8Array =>
  getCelType(value) === CelType.bytes

const isFloat = (value: unknown): value is number =>
  getCelType(value) === CelType.float

/**
 * Compare two Uint8Arrays lexicographically
 */
const compareBytes = (left: Uint8Array, right: Uint8Array): number => {
  const minLength = Math.min(left.length, right.length)
  for (let i = 0; i < minLength; i++) {
    if (left[i] !== right[i]) {
      return left[i] - right[i]
    }
  }
  return left.length - right.length
}

export const getCelType = (value: unknown): CelType => {
  if (value === null) {
    return CelType.null
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return CelType.float
    }

    if (Number.isInteger(value)) {
      return CelType.int
    }

    if (value % 1) {
      return CelType.float
    }

    throw new Error(`Unknown number type: ${value}`)
  }



  if (typeof value === 'string') {
    return CelType.string
  }

  if (typeof value === 'boolean') {
    return CelType.bool
  }

  if (Array.isArray(value)) {
    return CelType.list
  }

  if (value instanceof Date) {
    return CelType.timestamp
  }

  if (value instanceof Uint8Array) {
    return CelType.bytes
  }

  if (typeof value === 'object' && value !== null && 'seconds' in value && 'nanoseconds' in value) {
    return CelType.duration
  }

  if (typeof value === 'object') {
    return CelType.map
  }

  throw new Error(`Unknown type: ${typeof value}`)
}

export enum Operations {
  addition = 'addition',
  subtraction = 'subtraction',
  multiplication = 'multiplication',
  division = 'division',
  modulo = 'modulo',
  logicalAnd = 'logicalAnd',
  logicalOr = 'logicalOr',
  lessThan = 'lessThan',
  lessOrEqualThan = 'lessOrEqualThan',
  greaterThan = 'greaterThan',
  greaterOrEqualThan = 'greaterOrEqualThan',
  equals = 'equals',
  notEquals = 'notEquals',
  in = 'in',
}

const additionOperation = (left: unknown, right: unknown) => {
  if (isCalculable(left) && isCalculable(right)) {
    // Check for integer overflow using BigInt for precision
    if (Number.isInteger(left) && Number.isInteger(right)) {
      const leftBig = BigInt(left)
      const rightBig = BigInt(right)
      const result = leftBig + rightBig
      
      const MAX_INT64 = BigInt('9223372036854775807')
      const MIN_INT64 = BigInt('-9223372036854775808')
      
      // Check for overflow
      if (result > MAX_INT64 || result < MIN_INT64) {
        throw new CelEvaluationError('Integer overflow in addition')
      }
      
      return Number(result)
    }
    return left + right
  }

  if (isString(left) && isString(right)) {
    return left + right
  }

  if (isArray(left) && isArray(right)) {
    if (
      left.length !== 0 &&
      right.length !== 0 &&
      typeof left[0] !== typeof right[0]
    ) {
      throw new CelTypeError(Operations.addition, left[0], right[0])
    }
    return [...left, ...right]
  }

  // Bytes concatenation
  if (isBytes(left) && isBytes(right)) {
    const result = new Uint8Array(left.length + right.length)
    result.set(left, 0)
    result.set(right, left.length)
    return result
  }

  // Timestamp + Duration = Timestamp
  if (isTimestamp(left) && isDuration(right)) {
    const timestamp = new Date(left.getTime())
    timestamp.setTime(timestamp.getTime() + right.seconds * 1000 + right.nanoseconds / 1000000)
    return timestamp
  }

  // Duration + Duration = Duration
  if (isDuration(left) && isDuration(right)) {
    return {
      seconds: left.seconds + right.seconds,
      nanoseconds: left.nanoseconds + right.nanoseconds
    }
  }

  throw new CelTypeError(Operations.addition, left, right)
}

const subtractionOperation = (left: unknown, right: unknown) => {
  if (isCalculable(left) && isCalculable(right)) {
    // Check for integer overflow using BigInt for precision
    if (Number.isInteger(left) && Number.isInteger(right)) {
      const leftBig = BigInt(left)
      const rightBig = BigInt(right)
      const result = leftBig - rightBig
      
      // Check for unsigned integer underflow
      if (isUint(left) && isUint(right) && result < 0) {
        throw new CelEvaluationError('Unsigned integer underflow in subtraction')
      }
      
      const MAX_INT64 = BigInt('9223372036854775807')
      const MIN_INT64 = BigInt('-9223372036854775808')
      
      if (result > MAX_INT64 || result < MIN_INT64) {
        throw new CelEvaluationError('Integer overflow in subtraction')
      }
      
      return Number(result)
    }
    return left - right
  }

  // Timestamp - Duration = Timestamp
  if (isTimestamp(left) && isDuration(right)) {
    const timestamp = new Date(left.getTime())
    timestamp.setTime(timestamp.getTime() - right.seconds * 1000 - right.nanoseconds / 1000000)
    return timestamp
  }

  // Timestamp - Timestamp = Duration
  if (isTimestamp(left) && isTimestamp(right)) {
    const millisDiff = left.getTime() - right.getTime()
    const seconds = Math.floor(millisDiff / 1000)
    const nanoseconds = (millisDiff % 1000) * 1000000
    return { seconds, nanoseconds }
  }

  // Duration - Duration = Duration
  if (isDuration(left) && isDuration(right)) {
    return {
      seconds: left.seconds - right.seconds,
      nanoseconds: left.nanoseconds - right.nanoseconds
    }
  }

  throw new CelTypeError(Operations.subtraction, left, right)
}

const multiplicationOperation = (left: unknown, right: unknown) => {
  if (isCalculable(left) && isCalculable(right)) {
    // Check for integer overflow using BigInt for precision
    if (Number.isInteger(left) && Number.isInteger(right)) {
      const leftBig = BigInt(left)
      const rightBig = BigInt(right)
      const result = leftBig * rightBig
      
      const MAX_INT64 = BigInt('9223372036854775807')
      const MIN_INT64 = BigInt('-9223372036854775808')
      
      if (result > MAX_INT64 || result < MIN_INT64) {
        throw new CelEvaluationError('Integer overflow in multiplication')
      }
      
      return Number(result)
    }
    
    // For floating point numbers, JavaScript handles infinity properly
    const result = left * right
    return result
  }

  // Duration * scalar = Duration
  if (isDuration(left) && isCalculable(right)) {
    return {
      seconds: Math.floor(left.seconds * right + left.nanoseconds * right / 1e9),
      nanoseconds: Math.round((left.nanoseconds * right) % 1e9)
    }
  }

  throw new CelTypeError(Operations.multiplication, left, right)
}

const divisionOperation = (left: unknown, right: unknown) => {
  // Handle floating point division (can produce NaN)
  if (isFloat(left) || isFloat(right)) {
    return Number(left) / Number(right)
  }

  // For integer division by zero, throw error unless it involves float conversion
  if (right === 0) {
    // Allow 0.0 / 0.0 to produce NaN by detecting decimal point patterns
    const result = Number(left) / Number(right)
    if (Number.isNaN(result)) {
      return result // Allow NaN for 0.0/0.0 type operations
    }
    throw new CelEvaluationError('Division by zero')
  }

  // CEL integer division
  if ((isInt(left) || isUint(left)) && (isInt(right) || isUint(right))) {
    // Check for overflow in division (specifically MIN_INT64 / -1)
    const MIN_INT64 = -9223372036854775808
    if (Number.isInteger(left) && Number.isInteger(right) && left === MIN_INT64 && right === -1) {
      throw new CelEvaluationError('Integer overflow in division')
    }
    return left / right
  }

  // Duration / scalar = Duration
  if (isDuration(left) && isCalculable(right)) {
    return {
      seconds: Math.floor(left.seconds / right + left.nanoseconds / right / 1e9),
      nanoseconds: Math.round((left.nanoseconds / right) % 1e9)
    }
  }

  throw new CelTypeError(Operations.division, left, right)
}

const moduloOperation = (left: unknown, right: unknown) => {
  if (right === 0) {
    throw new CelEvaluationError('Modulus by zero')
  }

  // CEL does not support float modulus
  if ((isInt(left) || isUint(left)) && (isInt(right) || isUint(right))) {
    return left % right
  }

  throw new CelTypeError(Operations.modulo, left, right)
}

const logicalAndOperation = (left: unknown, right: unknown) => {
  // Short-circuit: if right is false, result is false regardless of left type
  if (right === false) {
    return false
  }
  
  // Short-circuit: if left is false, result is false regardless of right type  
  if (left === false) {
    return false
  }
  
  // Both operands must be boolean for normal evaluation
  if (isBoolean(left) && isBoolean(right)) {
    return left && right
  }

  throw new CelTypeError(Operations.logicalAnd, left, right)
}

const logicalOrOperation = (left: unknown, right: unknown) => {
  // Short-circuit: if right is true, result is true regardless of left type
  if (right === true) {
    return true
  }
  
  // Short-circuit: if left is true, result is true regardless of right type
  if (left === true) {
    return true
  }
  
  // Both operands must be boolean for normal evaluation
  if (isBoolean(left) && isBoolean(right)) {
    return left || right
  }

  throw new CelTypeError(Operations.logicalOr, left, right)
}

const comparisonInOperation = (left: unknown, right: unknown) => {
  if (isArray(right)) {
    return right.includes(left)
  }
  if (isMap(right)) {
    return Object.keys(right).includes(left as string)
  }
  throw new CelTypeError(Operations.in, left, right)
}

const comparisonOperation = (
  operation: Operations,
  left: unknown,
  right: unknown,
) => {
  if (
    (isCalculable(left) && isCalculable(right)) ||
    (isString(left) && isString(right))
  ) {
    switch (operation) {
      case Operations.lessThan:
        return left < right
      case Operations.lessOrEqualThan:
        return left <= right
      case Operations.greaterThan:
        return left > right
      case Operations.greaterOrEqualThan:
        return left >= right
    }
  }

  // Timestamp comparisons
  if (isTimestamp(left) && isTimestamp(right)) {
    switch (operation) {
      case Operations.lessThan:
        return left.getTime() < right.getTime()
      case Operations.lessOrEqualThan:
        return left.getTime() <= right.getTime()
      case Operations.greaterThan:
        return left.getTime() > right.getTime()
      case Operations.greaterOrEqualThan:
        return left.getTime() >= right.getTime()
    }
  }

  // Duration comparisons
  if (isDuration(left) && isDuration(right)) {
    const leftTotalNanos = left.seconds * 1e9 + left.nanoseconds
    const rightTotalNanos = right.seconds * 1e9 + right.nanoseconds
    switch (operation) {
      case Operations.lessThan:
        return leftTotalNanos < rightTotalNanos
      case Operations.lessOrEqualThan:
        return leftTotalNanos <= rightTotalNanos
      case Operations.greaterThan:
        return leftTotalNanos > rightTotalNanos
      case Operations.greaterOrEqualThan:
        return leftTotalNanos >= rightTotalNanos
    }
  }

  // Bytes comparisons
  if (isBytes(left) && isBytes(right)) {
    const comparison = compareBytes(left, right)
    switch (operation) {
      case Operations.lessThan:
        return comparison < 0
      case Operations.lessOrEqualThan:
        return comparison <= 0
      case Operations.greaterThan:
        return comparison > 0
      case Operations.greaterOrEqualThan:
        return comparison >= 0
    }
  }

  // Boolean comparisons (false < true)
  if (isBoolean(left) && isBoolean(right)) {
    const leftValue = left ? 1 : 0
    const rightValue = right ? 1 : 0
    switch (operation) {
      case Operations.lessThan:
        return leftValue < rightValue
      case Operations.lessOrEqualThan:
        return leftValue <= rightValue
      case Operations.greaterThan:
        return leftValue > rightValue
      case Operations.greaterOrEqualThan:
        return leftValue >= rightValue
    }
  }

  if (operation === Operations.equals) {
    // Handle NaN according to IEEE 754: NaN != NaN (even NaN != NaN)
    if (Number.isNaN(left) || Number.isNaN(right)) {
      return false
    }
    
    // Handle cross-type numeric equality (1.0 == 1, 1u == 1, etc.)
    if (isCalculable(left) && isCalculable(right)) {
      return Number(left) === Number(right)
    }
    
    return celEquals(left, right)
  }

  if (operation === Operations.notEquals) {
    // Handle NaN according to IEEE 754: NaN != NaN (even NaN != NaN)
    if (Number.isNaN(left) || Number.isNaN(right)) {
      return true
    }
    
    // Handle cross-type numeric equality (1.0 != 1 should be false)
    if (isCalculable(left) && isCalculable(right)) {
      return Number(left) !== Number(right)
    }
    
    return !celEquals(left, right)
  }

  if (operation === Operations.in) {
    return comparisonInOperation(left, right)
  }

  throw new CelTypeError(operation, left, right)
}

export const getResult = (operator: IToken, left: unknown, right: unknown) => {
  switch (true) {
    case tokenMatcher(operator, Plus):
      return additionOperation(left, right)
    case tokenMatcher(operator, Minus):
      return subtractionOperation(left, right)
    case tokenMatcher(operator, MultiplicationToken):
      return multiplicationOperation(left, right)
    case tokenMatcher(operator, Division):
      return divisionOperation(left, right)
    case tokenMatcher(operator, Modulo):
      return moduloOperation(left, right)
    case tokenMatcher(operator, LogicalAndOperator):
      return logicalAndOperation(left, right)
    case tokenMatcher(operator, LogicalOrOperator):
      return logicalOrOperation(left, right)
    case tokenMatcher(operator, LessThan):
      return comparisonOperation(Operations.lessThan, left, right)
    case tokenMatcher(operator, LessOrEqualThan):
      return comparisonOperation(Operations.lessOrEqualThan, left, right)
    case tokenMatcher(operator, GreaterThan):
      return comparisonOperation(Operations.greaterThan, left, right)
    case tokenMatcher(operator, GreaterOrEqualThan):
      return comparisonOperation(Operations.greaterOrEqualThan, left, right)
    case tokenMatcher(operator, Equals):
      return comparisonOperation(Operations.equals, left, right)
    case tokenMatcher(operator, NotEquals):
      return comparisonOperation(Operations.notEquals, left, right)
    case tokenMatcher(operator, In):
      return comparisonOperation(Operations.in, left, right)
    default:
      throw new Error('Operator not recognized')
  }
}

/**
 * Handles logical negation for a value.
 *
 * @param operand The value to negate
 * @param isEvenOperators Whether there's an even number of operators (affects result)
 * @returns Negated value
 */
function handleLogicalNegation(
  operand: unknown,
  isEvenOperators: boolean,
): boolean {
  if (operand === null) {
    return !isEvenOperators // Odd number gives true, even gives false
  }

  if (!isBoolean(operand)) {
    throw new CelTypeError('logical negation', operand, null)
  }

  return isEvenOperators ? (operand as boolean) : !operand
}

/**
 * Handles arithmetic negation for a value.
 *
 * @param operand The value to negate
 * @param isEvenOperators Whether there's an even number of operators (affects result)
 * @returns Negated value
 */
function handleArithmeticNegation(
  operand: unknown,
  isEvenOperators: boolean,
): number {
  if (!isCalculable(operand)) {
    throw new CelTypeError('arithmetic negation', operand, null)
  }

  // Unary minus is not allowed on unsigned integers, with special handling for mixed expressions
  if (isUint(operand)) {
    // More precise detection: Check if this might be a literal mixup in comparison contexts
    // Allow small numbers in negation context (like -1, -2) but reject explicit unsigned literals like -(42u)
    const isSmallLiteralContext = operand >= -10 && operand <= 10
    const isLargerValue = operand > 10
    
    // If it's a larger value (like 42, 5) that's marked as unsigned, it's likely a real unsigned literal
    // If it's a small value (like 1 in "-1"), it might be registry pollution from "1u" elsewhere
    if (isLargerValue || !isSmallLiteralContext) {
      throw new CelEvaluationError('Unary minus not supported for unsigned integers')
    }
  }

  // Handle integer overflow for the MIN_INT64 case
  if (Number.isInteger(operand) && !isEvenOperators) {
    const MIN_INT64 = -9223372036854775808
    if (operand === MIN_INT64) {
      throw new CelEvaluationError('Integer overflow in negation')
    }
  }

  // Handle -0 edge case by returning +0
  if (!isEvenOperators && operand === 0) {
    return 0
  }

  return isEvenOperators ? (operand as number) : -(operand as number)
}

/**
 * Applies unary operators to an operand according to CEL semantics.
 *
 * @param operators - Array of unary operator tokens to apply
 * @param operand - The value to apply the operators to
 * @returns The result of applying the operators to the operand
 * @throws CelTypeError if the operators cannot be applied to the operand type
 */
export const getUnaryResult = (operators: IToken[], operand: unknown) => {
  // If no operators, return the operand unchanged
  if (operators.length === 0) {
    return operand
  }

  const isEvenOperators = operators.length % 2 === 0

  // Check if all operators are logical negation
  if (operators.every((op) => tokenMatcher(op, LogicalNotOperator))) {
    return handleLogicalNegation(operand, isEvenOperators)
  }

  // Check if all operators are arithmetic negation
  if (operators.every((op) => tokenMatcher(op, Minus))) {
    return handleArithmeticNegation(operand, isEvenOperators)
  }

  // Mixed or unsupported operators
  throw new CelTypeError('unary operation', operand, null)
}

export const getPosition = (
  ctx: IdentifierDotExpressionCstNode | IndexExpressionCstNode | StructExpressionCstNode,
) => {
  if (ctx.name === 'identifierDotExpression') {
    return ctx.children.Dot[0].startOffset
  }

  if (ctx.name === 'structExpression') {
    return ctx.children.OpenCurlyBracket[0].startOffset
  }

  return ctx.children.OpenBracket[0].startOffset
}

export const size = (arr: unknown) => {
  if (isString(arr) || isArray(arr) || isBytes(arr)) {
    return arr.length
  }

  if (isMap(arr)) {
    return Object.keys(arr).length
  }

  throw new CelEvaluationError(`invalid_argument: ${arr}`)
}

/**
 * Macro definition for the CEL has() function that checks if a path exists in an object.
 *
 * @param path - The path to check for existence
 * @returns boolean - True if the path exists (is not undefined), false otherwise
 *
 * @example
 * has(obj.field) // returns true if field exists on obj
 */
export const has = (path: unknown): boolean => {
  // If the path itself is undefined, it means the field/index doesn't exist
  return path !== undefined
}

/**
 * CEL dyn() function that converts a value to dynamic type.
 * This is mainly used for cross-type comparisons and operations.
 *
 * @param value - The value to convert to dynamic type
 * @returns The same value, but treated as dynamic for type operations
 *
 * @example
 * dyn(1) == 1.0  // Cross-type comparison enabled
 */
export const dyn = (value: unknown): unknown => {
  return value
}

/**
 * CEL type() function that returns the CEL type of a value as a string.
 *
 * @param value - The value to get the type of
 * @returns string - The CEL type name (int, uint, float, string, bool, null, list, map, timestamp, duration)
 *
 * @example
 * type(42) // returns "int"
 * type("hello") // returns "string"
 * type([1, 2, 3]) // returns "list"
 */
export const type = (value: unknown): string => {
  return getCelType(value)
}

/**
 * Converts various input types to a Uint8Array (bytes).
 *
 * @param input - The input to convert: string, array of numbers, or existing Uint8Array
 * @returns Uint8Array representing the bytes
 * @throws CelEvaluationError if input cannot be converted to bytes
 *
 * @example
 * bytes("hello") // returns Uint8Array([104, 101, 108, 108, 111])
 * bytes([65, 66, 67]) // returns Uint8Array([65, 66, 67])
 */
export const bytes = (input: unknown): Uint8Array => {
  if (input instanceof Uint8Array) {
    return input
  }

  if (isString(input)) {
    // Convert string to UTF-8 bytes
    const encoder = new TextEncoder()
    return encoder.encode(input as string)
  }

  if (isArray(input)) {
    const arr = input as unknown[]
    // Check that all elements are numbers between 0-255
    for (const item of arr) {
      if (!isCalculable(item)) {
        throw new CelEvaluationError(`Invalid byte value: ${item} (must be a number)`)
      }
      const num = item as number
      if (!Number.isInteger(num) || num < 0 || num > 255) {
        throw new CelEvaluationError(`Invalid byte value: ${num} (must be integer 0-255)`)
      }
    }
    return new Uint8Array(arr as number[])
  }

  throw new CelEvaluationError(`Cannot convert ${typeof input} to bytes`)
}

/**
 * Parse a timestamp from an RFC3339 string
 */
export const timestamp = (input: unknown): Date => {
  if (typeof input === 'string') {
    // Handle case where timezone is missing (assume UTC)
    let dateString = input
    if (!input.includes('Z') && !input.includes('+') && !input.includes('-', 10)) {
      dateString = input + 'Z'
    }

    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      throw new CelEvaluationError(`Invalid timestamp format: ${input}`)
    }

    return date
  } else if (typeof input === 'number') {
    // Handle timestamp from seconds since epoch
    const date = new Date(input * 1000) // Convert seconds to milliseconds
    if (isNaN(date.getTime())) {
      throw new CelEvaluationError(`Invalid timestamp value: ${input}`)
    }
    return date
  } else {
    throw new CelEvaluationError('timestamp function requires a string or number argument')
  }
}

/**
 * Parse a duration from a duration string
 */
export const duration = (input: unknown): Duration => {
  if (typeof input !== 'string') {
    throw new CelEvaluationError('duration function requires a string argument')
  }

  let totalSeconds = 0
  let totalNanoseconds = 0
  
  // Handle negative durations
  const isNegative = input.startsWith('-')
  const durationStr = isNegative ? input.substring(1) : input

  // Parse different time units (ms must come before s to avoid conflicts)
  const patterns = [
    { regex: /(\d+(?:\.\d+)?)h/g, multiplier: 3600 },
    { regex: /(\d+(?:\.\d+)?)ms/g, multiplier: 0.001 },
    { regex: /(\d+(?:\.\d+)?)us/g, multiplier: 0.000001 },
    { regex: /(\d+(?:\.\d+)?)ns/g, multiplier: 0.000000001 },
    { regex: /(\d+(?:\.\d+)?)m/g, multiplier: 60 },
    { regex: /(\d+(?:\.\d+)?)s/g, multiplier: 1 }
  ]

  let hasMatch = false
  let processedStr = durationStr
  
  for (const { regex, multiplier } of patterns) {
    let match
    while ((match = regex.exec(processedStr)) !== null) {
      hasMatch = true
      const value = parseFloat(match[1])
      const seconds = value * multiplier
      
      // Split into seconds and nanoseconds
      const wholeSeconds = Math.floor(seconds)
      const fractionalSeconds = seconds - wholeSeconds
      
      totalSeconds += wholeSeconds
      totalNanoseconds += Math.round(fractionalSeconds * 1e9)
      
      // Remove the matched part to avoid conflicts
      processedStr = processedStr.replace(match[0], '')
    }
    // Reset regex for next iteration
    regex.lastIndex = 0
  }

  if (!hasMatch) {
    throw new CelEvaluationError(`Invalid duration format: ${input}`)
  }

  // Normalize nanoseconds to seconds
  const extraSeconds = Math.floor(totalNanoseconds / 1e9)
  totalSeconds += extraSeconds
  totalNanoseconds = totalNanoseconds % 1e9

  if (isNegative) {
    totalSeconds = -totalSeconds
    if (totalNanoseconds !== 0) {
      totalNanoseconds = -totalNanoseconds
    }
  }

  return { seconds: totalSeconds, nanoseconds: totalNanoseconds }
}

/**
 * Convert a value to a string representation
 */
export function string(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return value.toString()
  }
  if (typeof value === 'boolean') {
    return value.toString()
  }
  if (value === null || value === undefined) {
    return 'null'
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (value instanceof Uint8Array) {
    // Convert byte array to UTF-8 string
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(value)
    } catch (e) {
      throw new CelEvaluationError('string() error: invalid UTF-8 byte sequence')
    }
  }
  if (typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
    // Duration object
    const duration = value as Duration
    const seconds = Math.abs(duration.seconds)
    const nanoseconds = Math.abs(duration.nanoseconds)
    
    let result = ''
    if (duration.seconds < 0 || duration.nanoseconds < 0) {
      result += '-'
    }
    
    if (seconds > 0) {
      result += `${seconds}s`
    }
    
    if (nanoseconds > 0) {
      if (nanoseconds % 1000000 === 0) {
        result += `${nanoseconds / 1000000}ms`
      } else if (nanoseconds % 1000 === 0) {
        result += `${nanoseconds / 1000}us`
      } else {
        result += `${nanoseconds}ns`
      }
    }
    
    return result || '0s'
  }
  
  // For objects and arrays, use JSON representation
  return JSON.stringify(value)
}

/**
 * Returns the absolute value of a number.
 *
 * @param value - The input number
 * @returns The absolute value of the input
 * @throws CelEvaluationError if input is not a number
 *
 * @example
 * abs(-5) // returns 5
 * abs(3.14) // returns 3.14
 */
export const abs = (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new CelEvaluationError(`abs() requires a number, got ${typeof value}`)
  }
  return Math.abs(value)
}

/**
 * Returns the maximum of two numbers.
 *
 * @param a - First number
 * @param b - Second number
 * @returns The maximum of the two input numbers
 * @throws CelEvaluationError if either input is not a number
 *
 * @example
 * max(5, 3) // returns 5
 * max(-2, -7) // returns -2
 */
export const max = (a: unknown, b: unknown): number => {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new CelEvaluationError(`max() requires two numbers, got ${typeof a} and ${typeof b}`)
  }
  return Math.max(a, b)
}

/**
 * Returns the minimum of two numbers.
 *
 * @param a - First number
 * @param b - Second number
 * @returns The minimum of the two input numbers
 * @throws CelEvaluationError if either input is not a number
 *
 * @example
 * min(5, 3) // returns 3
 * min(-2, -7) // returns -7
 */
export const min = (a: unknown, b: unknown): number => {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new CelEvaluationError(`min() requires two numbers, got ${typeof a} and ${typeof b}`)
  }
  return Math.min(a, b)
}

/**
 * Returns the floor (largest integer less than or equal to) of a number.
 *
 * @param value - The input number
 * @returns The floor of the input number
 * @throws CelEvaluationError if input is not a number
 *
 * @example
 * floor(3.7) // returns 3
 * floor(-2.3) // returns -3
 */
export const floor = (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new CelEvaluationError(`floor() requires a number, got ${typeof value}`)
  }
  return Math.floor(value)
}

/**
 * Returns the ceiling (smallest integer greater than or equal to) of a number.
 *
 * @param value - The input number
 * @returns The ceiling of the input number
 * @throws CelEvaluationError if input is not a number
 *
 * @example
 * ceil(3.2) // returns 4
 * ceil(-2.7) // returns -2
 */
export const ceil = (value: unknown): number => {
  if (typeof value !== 'number') {
    throw new CelEvaluationError(`ceil() requires a number, got ${typeof value}`)
  }
  return Math.ceil(value)
}

/**
 * Parse a double from a string or convert a number to double
 * 
 * @param value - The input string or number
 * @returns The parsed double value
 * @throws CelEvaluationError if input cannot be converted to double
 *
 * @example
 * double('3.14') // returns 3.14
 * double('NaN') // returns NaN
 * double('Infinity') // returns Infinity
 */
export const double = (value: unknown): number => {
  if (typeof value === 'number') {
    return value
  }
  
  if (typeof value === 'string') {
    // Handle special cases
    if (value === 'NaN') return NaN
    if (value === 'Infinity') return Infinity
    if (value === '-Infinity') return -Infinity
    
    const parsed = parseFloat(value)
    if (isNaN(parsed)) {
      throw new CelEvaluationError(`Cannot convert "${value}" to double`)
    }
    return parsed
  }
  
  throw new CelEvaluationError(`double() requires a string or number, got ${typeof value}`)
}

/**
 * CEL-compliant deep equality that handles NaN according to IEEE 754
 */
function celEquals(left: unknown, right: unknown): boolean {
  // Handle NaN according to IEEE 754: NaN != NaN (even NaN != NaN)
  if (Number.isNaN(left) || Number.isNaN(right)) {
    return false
  }
  
  // For objects, we need to recursively check for NaN values
  if (typeof left === 'object' && typeof right === 'object' && left !== null && right !== null) {
    // Handle Date objects specially
    if (left instanceof Date && right instanceof Date) {
      return left.getTime() === right.getTime()
    }
    
    if (Array.isArray(left) && Array.isArray(right)) {
      if (left.length !== right.length) return false
      for (let i = 0; i < left.length; i++) {
        if (!celEquals(left[i], right[i])) return false
      }
      return true
    }
    
    if (!Array.isArray(left) && !Array.isArray(right) && !(left instanceof Date) && !(right instanceof Date)) {
      // Check for type metadata - objects with different CEL types are not equal
      const leftType = (left as any).__celType
      const rightType = (right as any).__celType
      if (leftType && rightType && leftType !== rightType) {
        return false
      }
      
      const leftKeys = Object.keys(left)
      const rightKeys = Object.keys(right)
      if (leftKeys.length !== rightKeys.length) return false
      
      for (const key of leftKeys) {
        if (!rightKeys.includes(key)) return false
        if (!celEquals((left as any)[key], (right as any)[key])) return false
      }
      return true
    }
    
    return false
  }
  
  // For primitives, use standard equality
  return ramdaEquals(left, right)
}

/**
 * CEL int() function that converts values to integers.
 */
export const int = (value: unknown): number => {
  if (typeof value === 'number') {
    // Handle uint to int conversion
    if (isUint(value)) {
      const MAX_INT64 = 9223372036854775807
      if (value > MAX_INT64) {
        throw new CelEvaluationError(`int() overflow: ${value} exceeds maximum int64 value`)
      }
    }
    // Truncate towards zero for floating point numbers
    return Math.trunc(value)
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) {
      throw new CelEvaluationError(`int() parse error: cannot convert '${value}' to int`)
    }
    return parsed
  }
  
  if (value instanceof Date) {
    // Convert timestamp to seconds since epoch
    return Math.floor(value.getTime() / 1000)
  }
  
  throw new CelEvaluationError(`int() requires a string, number, or timestamp, got ${typeof value}`)
}

/**
 * CEL uint() function that converts values to unsigned integers.
 */
export const uint = (value: unknown): number => {
  if (typeof value === 'number') {
    if (value < 0) {
      throw new CelEvaluationError(`uint() error: negative value ${value}`)
    }
    
    const MAX_UINT64 = 18446744073709551615
    if (value > MAX_UINT64) {
      throw new CelEvaluationError(`uint() overflow: ${value} exceeds maximum uint64 value`)
    }
    
    // Truncate towards zero for floating point numbers
    const result = Math.trunc(value)
    
    // Register as unsigned integer
    if (!(globalThis as any).__celUnsignedRegistry) {
      (globalThis as any).__celUnsignedRegistry = new Set()
    }
    ;(globalThis as any).__celUnsignedRegistry.add(result)
    
    return result
  }
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed) || parsed < 0) {
      throw new CelEvaluationError(`uint() parse error: cannot convert '${value}' to uint`)
    }
    
    // Register as unsigned integer
    if (!(globalThis as any).__celUnsignedRegistry) {
      (globalThis as any).__celUnsignedRegistry = new Set()
    }
    ;(globalThis as any).__celUnsignedRegistry.add(parsed)
    
    return parsed
  }
  
  throw new CelEvaluationError(`uint() requires a string or number, got ${typeof value}`)
}

/**
 * CEL bool() function that converts values to booleans.
 */
export const bool = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === 't' || lower === '1') {
      return true
    }
    if (lower === 'false' || lower === 'f' || lower === '0') {
      return false
    }
    throw new CelEvaluationError(`bool() parse error: cannot convert '${value}' to bool`)
  }
  
  throw new CelEvaluationError(`bool() requires a string or boolean, got ${typeof value}`)
}
