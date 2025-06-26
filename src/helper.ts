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
} from './cst-definitions.js'
import { equals } from 'ramda'

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
  getCelType(value) === CelType.uint

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

export const getCelType = (value: unknown): CelType => {
  if (value === null) {
    return CelType.null
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 0) {
      return CelType.uint
    }

    if (Number.isInteger(value) && value <= 0) {
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
    return left * right
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
  if (right === 0) {
    throw new CelEvaluationError('Division by zero')
  }

  // CEL does not support float division
  if ((isInt(left) || isUint(left)) && (isInt(right) || isUint(right))) {
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
  if (isBoolean(left) && isBoolean(right)) {
    return left && right
  }

  throw new CelTypeError(Operations.logicalAnd, left, right)
}

const logicalOrOperation = (left: unknown, right: unknown) => {
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

  if (operation === Operations.equals) {
    return equals(left, right)
  }

  if (operation === Operations.notEquals) {
    return !equals(left, right)
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
  ctx: IdentifierDotExpressionCstNode | IndexExpressionCstNode,
) => {
  if (ctx.name === 'identifierDotExpression') {
    return ctx.children.Dot[0].startOffset
  }

  return ctx.children.OpenBracket[0].startOffset
}

export const size = (arr: unknown) => {
  if (isString(arr) || isArray(arr)) {
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
  if (typeof input !== 'string') {
    throw new CelEvaluationError('timestamp function requires a string argument')
  }

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
