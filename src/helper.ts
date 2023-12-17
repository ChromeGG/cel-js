import { IToken, tokenMatcher } from 'chevrotain'
import { Minus, Plus } from './tokens'
import { CelTypeError } from './errors/CelTypeError'

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

const isString = (value: unknown): value is string => {
  return getCelType(value) === CelType.string
}

const isArray = (value: unknown): value is unknown[] => {
  return getCelType(value) === CelType.list
}

export const getCelType = (value: unknown): CelType => {
  if (value === null) {
    return CelType.null
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? CelType.int : CelType.float
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

export const additionOperation = (
  lhs: unknown,
  rhs: unknown,
  operator: IToken
) => {
  if (tokenMatcher(operator, Plus)) {
    if (isCalculable(lhs) && isCalculable(rhs)) {
      return lhs + rhs
    }

    if (isString(lhs) && isString(rhs)) {
      return lhs + rhs
    }

    if (isArray(lhs) && isArray(rhs)) {
      return lhs.concat(rhs)
    }
  }

  if (tokenMatcher(operator, Minus) && isCalculable(lhs) && isCalculable(rhs)) {
    return lhs - rhs
  }

  throw new CelTypeError('addition', lhs, rhs)
}
