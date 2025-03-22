import { Operations, getCelType } from '../helper.js'

export class CelTypeError extends Error {
  /**
   * Creates a new CelTypeError for type incompatibilities in operations.
   *
   * @param operation - The operation being performed
   * @param left - The left operand value
   * @param right - The right operand value or null for unary operations
   * @param customMessage - Optional custom error message to use instead of the default
   */
  constructor(
    operation: Operations | string,
    left: unknown,
    right: unknown
  ) {
    const leftType = getCelType(left)
    const rightType = getCelType(right)

    let message: string
    switch (operation) {
      case 'unaric operation':
        message = `CelTypeError: Invalid or mixed unary operators ` +
          ` applied to ${leftType}`
        break
      case 'arithmetic negation':
      case 'logical negation':
        message = `CelTypeError: ${operation} operation cannot be ` +
          `applied to value of type ${leftType}`
        break
      default:
        message = `CelTypeError: ${operation} operation ` +
          `cannot be applied to (${leftType}, ${rightType})`
    }

    super(message)
    this.name = 'CelTypeError'
  }
}
