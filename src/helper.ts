import { IToken, tokenMatcher } from 'chevrotain'
import { Division, Minus, Modulo, MultiplicationToken, Plus } from './tokens'
import { CelTypeError } from './errors/CelTypeError'
import { CelEvaluationError } from './errors/CelEvaluationError'

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

export const getCelType = (value: unknown): CelType => {
  if (value === null) {
    return CelType.null
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value) && value > 0) {
      return CelType.uint
    }

    if (Number.isInteger(value) && value < 0) {
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

export const additionOperationDeprecated = (
  left: unknown,
  right: unknown,
  operator: IToken
) => {
  if (tokenMatcher(operator, Plus)) {
    if (isCalculable(left) && isCalculable(right)) {
      return left + right
    }

    if (isString(left) && isString(right)) {
      return left + right
    }

    if (isArray(left) && isArray(right)) {
      return left.concat(right)
    }
  }

  if (
    tokenMatcher(operator, Minus) &&
    isCalculable(left) &&
    isCalculable(right)
  ) {
    return left - right
  }

  throw new CelTypeError(Operations.addition, left, right)
}

export enum Operations {
  addition = 'addition',
  subtraction = 'subtraction',
  multiplication = 'multiplication',
  division = 'division',
  modulo = 'modulo',
}

export const getOperationName = (operator: IToken): Operations => {
  switch (true) {
    case tokenMatcher(operator, Plus):
      return Operations.addition
    case tokenMatcher(operator, Minus):
      return Operations.subtraction
    case tokenMatcher(operator, MultiplicationToken):
      return Operations.multiplication
    case tokenMatcher(operator, Division):
      return Operations.division
    case tokenMatcher(operator, Modulo):
      return Operations.modulo
    default:
      throw new Error('Operator not recognized')
  }
}

const additionOperation = (left: unknown, right: unknown) => {
  if (isCalculable(left) && isCalculable(right)) {
    return left + right
  }

  if (isString(left) && isString(right)) {
    return left + right
  }

  if (isArray(left) && isArray(right)) {
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

export const getResult = (operator: IToken, left: unknown, right: unknown) => {
  const operationName = getOperationName(operator)

  switch (operationName) {
    case Operations.addition:
      return additionOperation(left, right)
    case Operations.subtraction:
      return subtractionOperation(left, right)
    case Operations.multiplication:
      return multiplicationOperation(left, right)
    case Operations.division:
      return divisionOperation(left, right)
    case Operations.modulo:
      return moduloOperation(left, right)
    default:
      throw new Error('Operator not recognized')
  }
}
