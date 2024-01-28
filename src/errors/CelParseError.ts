export class CelParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CelParseError'
  }
}
