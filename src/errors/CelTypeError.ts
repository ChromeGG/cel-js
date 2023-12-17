import { getCelType } from '../helper'

export class CelTypeError extends Error {
  constructor(operation: string, left: unknown, right: unknown) {
    const leftType = getCelType(left)
    const rightType = getCelType(right)
    const message = `CelTypeError: ${operation} operation cannot be applied to (${leftType}, ${rightType})`
    super(message)
    this.name = 'CelTypeError'
  }
}
