import { ConformanceTestFile, ConformanceTestValue } from './types'

// Simple textproto parser for CEL conformance tests
export class TextprotoParser {
  private pos = 0
  private text = ''

  parse(content: string): ConformanceTestFile {
    this.text = content.replace(/\r\n/g, '\n')
    this.pos = 0
    
    return this.parseTestFile()
  }

  private parseTestFile(): ConformanceTestFile {
    const result: ConformanceTestFile = {
      name: '',
      description: '',
      section: []
    }

    while (this.pos < this.text.length) {
      this.skipWhitespaceAndComments()
      if (this.pos >= this.text.length) break

      const key = this.parseIdentifier()
      this.skipWhitespace()
      
      if (this.peek() === ':') {
        this.pos++
        this.skipWhitespace()
        
        if (key === 'name') {
          result.name = this.parseString()
        } else if (key === 'description') {
          result.description = this.parseString()
        }
      } else if (this.peek() === '{') {
        // Field with object value (no colon)
        if (key === 'section') {
          result.section.push(this.parseSection())
        }
      }
    }

    return result
  }

  private parseSection() {
    this.expect('{')
    const section = { name: '', description: '', test: [] as any[] }

    while (this.pos < this.text.length) {
      this.skipWhitespaceAndComments()
      if (this.peek() === '}') {
        this.pos++
        break
      }

      const key = this.parseIdentifier()
      this.skipWhitespace()
      
      if (this.peek() === ':') {
        this.pos++
        this.skipWhitespace()
        
        if (key === 'name') {
          section.name = this.parseString()
        } else if (key === 'description') {
          section.description = this.parseString()
        }
      } else if (this.peek() === '{') {
        // Field with object value (no colon)
        if (key === 'test') {
          section.test.push(this.parseTest())
        }
      }
    }

    return section
  }

  private parseTest() {
    this.expect('{')
    const test: any = {}

    while (this.pos < this.text.length) {
      this.skipWhitespaceAndComments()
      if (this.peek() === '}') {
        this.pos++
        break
      }

      const key = this.parseIdentifier()
      this.skipWhitespace()
      this.expect(':')
      this.skipWhitespace()

      if (key === 'name') {
        test.name = this.parseString()
      } else if (key === 'description') {
        test.description = this.parseString()
      } else if (key === 'expr') {
        test.expr = this.parseString()
      } else if (key === 'value') {
        test.value = this.parseValue()
      } else if (key === 'eval_error') {
        test.eval_error = this.parseValue()
      } else if (key === 'disable_check') {
        test.disable_check = this.parseBoolean()
      } else if (key === 'type_env') {
        if (!test.type_env) test.type_env = []
        test.type_env.push(this.parseValue())
      } else if (key === 'bindings') {
        if (!test.bindings) test.bindings = {}
        const binding = this.parseValue()
        if (binding.key && binding.value) {
          test.bindings[binding.key] = { value: binding.value }
        }
      } else {
        // Skip unknown fields
        this.skipValue()
      }
    }

    return test
  }

  private parseValue(): any {
    this.skipWhitespace()
    
    if (this.peek() === '{') {
      return this.parseObject()
    } else if (this.peek() === '[') {
      return this.parseArray()
    } else if (this.peek() === '"' || this.peek() === "'") {
      return this.parseString()
    } else if (this.peek() === 't' || this.peek() === 'f') {
      return this.parseBoolean()
    } else if (this.peek() === 'n') {
      return this.parseNull()
    } else if (this.isDigit(this.peek()) || this.peek() === '-') {
      return this.parseNumber()
    } else {
      return this.parseIdentifier()
    }
  }

  private parseObject(): any {
    this.expect('{')
    const obj: any = {}

    while (this.pos < this.text.length) {
      this.skipWhitespaceAndComments()
      if (this.peek() === '}') {
        this.pos++
        break
      }

      const key = this.parseIdentifier()
      this.skipWhitespace()

      if (this.peek() === ':') {
        this.pos++
        this.skipWhitespace()
        obj[key] = this.parseValue()
      } else if (this.peek() === '{') {
        // Nested object
        obj[key] = this.parseObject()
      } else {
        // Skip unknown structure
        this.skipValue()
      }
      
      // Skip optional comma or whitespace
      this.skipWhitespace()
      if (this.peek() === ',') {
        this.pos++
      }
    }

    return obj
  }

  private parseArray(): any[] {
    this.expect('[')
    const arr: any[] = []

    while (this.pos < this.text.length) {
      this.skipWhitespaceAndComments()
      if (this.peek() === ']') {
        this.pos++
        break
      }

      arr.push(this.parseValue())
      this.skipWhitespace()
      if (this.peek() === ',') {
        this.pos++
      }
    }

    return arr
  }

  private parseString(): string {
    const quote = this.peek()
    if (quote !== '"' && quote !== "'") {
      throw new Error(`Expected string, got ${quote}`)
    }
    
    this.pos++
    let result = ''
    
    while (this.pos < this.text.length && this.peek() !== quote) {
      if (this.peek() === '\\') {
        this.pos++
        const escaped = this.peek()
        switch (escaped) {
          case 'n': result += '\n'; break
          case 't': result += '\t'; break
          case 'r': result += '\r'; break
          case '\\': result += '\\'; break
          case '"': result += '"'; break
          case "'": result += "'"; break
          default: result += escaped; break
        }
      } else {
        result += this.peek()
      }
      this.pos++
    }
    
    this.expect(quote)
    return result
  }

  private parseNumber(): number {
    let result = ''
    if (this.peek() === '-') {
      result += this.peek()
      this.pos++
    }
    
    while (this.pos < this.text.length && (this.isDigit(this.peek()) || this.peek() === '.')) {
      result += this.peek()
      this.pos++
    }
    
    return parseFloat(result)
  }

  private parseBoolean(): boolean {
    const word = this.parseIdentifier()
    return word === 'true'
  }

  private parseNull(): null {
    this.parseIdentifier() // consume 'null' or 'NULL_VALUE'
    return null
  }

  private parseIdentifier(): string {
    let result = ''
    while (this.pos < this.text.length && (this.isAlphaNumeric(this.peek()) || this.peek() === '_')) {
      result += this.peek()
      this.pos++
    }
    return result
  }

  private skipValue(): void {
    this.skipWhitespace()
    if (this.peek() === '{') {
      this.skipObject()
    } else if (this.peek() === '[') {
      this.skipArray()
    } else if (this.peek() === '"' || this.peek() === "'") {
      this.parseString()
    } else {
      this.parseIdentifier()
    }
  }

  private skipObject(): void {
    this.expect('{')
    let depth = 1
    while (this.pos < this.text.length && depth > 0) {
      if (this.peek() === '{') depth++
      else if (this.peek() === '}') depth--
      this.pos++
    }
  }

  private skipArray(): void {
    this.expect('[')
    let depth = 1
    while (this.pos < this.text.length && depth > 0) {
      if (this.peek() === '[') depth++
      else if (this.peek() === ']') depth--
      this.pos++
    }
  }

  private skipWhitespace(): void {
    while (this.pos < this.text.length && this.isWhitespace(this.peek())) {
      this.pos++
    }
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.text.length) {
      if (this.isWhitespace(this.peek())) {
        this.pos++
      } else if (this.peek() === '#') {
        // Skip comment line
        while (this.pos < this.text.length && this.peek() !== '\n') {
          this.pos++
        }
      } else {
        break
      }
    }
  }

  private peek(): string {
    return this.text[this.pos] || ''
  }

  private expect(char: string): void {
    if (this.peek() !== char) {
      throw new Error(`Expected '${char}', got '${this.peek()}' at position ${this.pos}`)
    }
    this.pos++
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char)
  }

  private isDigit(char: string): boolean {
    return /\d/.test(char)
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9]/.test(char)
  }
}

// Convert conformance test value to JavaScript value
export function conformanceValueToJS(value: ConformanceTestValue): any {
  if (value.int64_value !== undefined) return value.int64_value
  if (value.uint64_value !== undefined) return value.uint64_value
  if (value.double_value !== undefined) return value.double_value
  if (value.string_value !== undefined) return value.string_value
  if (value.bytes_value !== undefined) {
    // Convert byte string to Uint8Array
    const bytes = new Uint8Array(value.bytes_value.length)
    for (let i = 0; i < value.bytes_value.length; i++) {
      bytes[i] = value.bytes_value.charCodeAt(i)
    }
    return bytes
  }
  if (value.bool_value !== undefined) return value.bool_value
  if (value.null_value !== undefined) return null
  if (value.type_value !== undefined) return value.type_value
  if (value.list_value) {
    return (value.list_value.values || []).map(conformanceValueToJS)
  }
  if (value.map_value) {
    const result: any = {}
    for (const entry of value.map_value.entries || []) {
      const key = conformanceValueToJS(entry.key)
      const val = conformanceValueToJS(entry.value)
      result[key] = val
    }
    return result
  }
  return undefined
}
