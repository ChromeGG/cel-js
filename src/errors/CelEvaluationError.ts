export class CelEvaluationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CelEvaluationError'
  }
}
