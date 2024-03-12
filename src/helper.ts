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
import { deepStrictEqual } from 'assert'

export enum CelType {
  int = 'int',
  uint = 'uint',
  float = 'float',
  string = 'string',
  bool = 'bool',
  null = 'null',
  list = 'list',
  map = 'map',
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

  throw new CelTypeError(Operations.addition, left, right)
}

const subtractionOperation = (left: unknown, right: unknown) => {
  if (isCalculable(left) && isCalculable(right)) {
    return left - right
  }

  throw new CelTypeError(Operations.subtraction, left, right)
}

const multiplicationOperation = (left: unknown, right: unknown) => {
  if (isCalculable(left) && isCalculable(right)) {
    return left * right
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

const comparisonEqualForMap = (left: object, right: object): boolean => {
  try {
    deepStrictEqual(left, right)
    return true
  } catch {
    return false
  }
}

const comparisonInOperation = (left: unknown, right: unknown) => {
  if(isArray(right)) {
    return right.includes(left)
  }
  if(isMap(right)) {
    return Object.keys(right).includes(left as string)
  }
  throw new CelTypeError(Operations.in, left, right)
}

const comparisonOperation = (
  operation: Operations,
  left: unknown,
  right: unknown
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

  if (operation === Operations.equals) {
    if (isMap(left) && isMap(right)) {
      return comparisonEqualForMap(left, right)
    }
    return left === right
  }

  if (operation === Operations.notEquals) {
    return left !== right
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

export const getUnaryResult = (operators: IToken[], operand: unknown) => {
  if (
    isCalculable(operand) &&
    operators.every((operator) => tokenMatcher(operator, Minus))
  ) {
    if (operators.length % 2 === 0) {
      return operand
    }

    return -operand
  }

  if (
    isBoolean(operand) &&
    operators.every((operator) => tokenMatcher(operator, LogicalNotOperator))
  ) {
    if (operators.length % 2 === 0) {
      return operand
    }

    return !operand
  }

  // TODO this error message is not correct
  throw new CelTypeError(Operations.addition, operand, null)
}

export const getPosition = (
  ctx: IdentifierDotExpressionCstNode | IndexExpressionCstNode
) => {
  if (ctx.name === 'identifierDotExpression') {
    return ctx.children.Dot[0].startOffset
  }

  return ctx.children.OpenBracket[0].startOffset
}
