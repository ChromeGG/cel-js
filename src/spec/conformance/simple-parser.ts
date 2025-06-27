import { ConformanceTestFile, ConformanceTestValue } from './types'

function extractBalancedBraces(text: string, startIndex: number): string | null {
  let braceCount = 0
  let i = startIndex
  
  // Skip the opening brace
  if (text[i] === '{') {
    braceCount = 1
    i++
  }
  
  const start = i
  
  while (i < text.length && braceCount > 0) {
    if (text[i] === '{') {
      braceCount++
    } else if (text[i] === '}') {
      braceCount--
    }
    i++
  }
  
  if (braceCount === 0) {
    return text.substring(start, i - 1).trim()
  }
  
  return null
}

function extractSections(content: string): string[] {
  const sections: string[] = []
  let pos = 0
  
  while (pos < content.length) {
    const sectionStart = content.indexOf('section {', pos)
    if (sectionStart === -1) break
    
    // Find the matching closing brace
    let braceCount = 0
    let i = sectionStart
    let startOfContent = -1
    
    while (i < content.length) {
      if (content[i] === '{') {
        braceCount++
        if (startOfContent === -1) {
          startOfContent = i + 1
        }
      } else if (content[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          // Found the end of the section
          sections.push(content.substring(startOfContent, i))
          pos = i + 1
          break
        }
      }
      i++
    }
    
    if (braceCount > 0) break // Unmatched braces
  }
  
  return sections
}

function extractTests(sectionContent: string): string[] {
  const tests: string[] = []
  let pos = 0
  
  while (pos < sectionContent.length) {
    const testStart = sectionContent.indexOf('test {', pos)
    if (testStart === -1) break
    
    // Find the matching closing brace
    let braceCount = 0
    let i = testStart
    let startOfContent = -1
    
    while (i < sectionContent.length) {
      if (sectionContent[i] === '{') {
        braceCount++
        if (startOfContent === -1) {
          startOfContent = i + 1
        }
      } else if (sectionContent[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          // Found the end of the test
          tests.push(sectionContent.substring(startOfContent, i))
          pos = i + 1
          break
        }
      }
      i++
    }
    
    if (braceCount > 0) break // Unmatched braces
  }
  
  return tests
}

export function parseBasicTextproto(content: string): ConformanceTestFile {
  // Simple regex-based parser for the specific textproto format
  const lines = content.split('\n').filter(line => !line.trim().startsWith('#') && line.trim())
  
  const result: ConformanceTestFile = {
    name: '',
    description: '',
    section: []
  }
  
  // Extract name and description
  const nameMatch = content.match(/^name:\s*"([^"]*)"$/m)
  if (nameMatch) result.name = nameMatch[1]
  
  const descMatch = content.match(/^description:\s*"([^"]*)"$/m)
  if (descMatch) result.description = descMatch[1]
  
  // Extract sections using a more sophisticated approach
  const sections = extractSections(content)
  
  for (const sectionText of sections) {
    
    const section = {
      name: '',
      description: '',
      test: [] as any[]
    }
    
    // Extract section name and description
    const sectionNameMatch = sectionText.match(/name:\s*"([^"]*)"/);  
    if (sectionNameMatch) section.name = sectionNameMatch[1]
    
    const sectionDescMatch = sectionText.match(/description:\s*"([^"]*)"/);
    if (sectionDescMatch) section.description = sectionDescMatch[1]
    
    // Extract tests
    const tests = extractTests(sectionText)
    
    for (const testContent of tests) {
      
      const test: any = {}
      
      // Extract test fields
      const testNameMatch = testContent.match(/name:\s*"([^"]*)"/);
      if (testNameMatch) test.name = testNameMatch[1]
      
      const testDescMatch = testContent.match(/description:\s*"([^"]*)"/);
      if (testDescMatch) test.description = testDescMatch[1]
      
      // Extract expression with proper escape handling
      const exprDoubleQuoteMatch = testContent.match(/expr:\s*"((?:[^"\\]|\\.)*)"/);
      const exprSingleQuoteMatch = testContent.match(/expr:\s*'((?:[^'\\]|\\.)*)'/);
      
      if (exprDoubleQuoteMatch) {
        const rawExpr = exprDoubleQuoteMatch[1];
        // Process escape sequences for textproto strings
        test.expr = rawExpr.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      } else if (exprSingleQuoteMatch) {
        const rawExpr = exprSingleQuoteMatch[1];
        // Process escape sequences for textproto strings  
        test.expr = rawExpr.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      }
      
      const disableCheckMatch = testContent.match(/disable_check:\s*(true|false)/);
      if (disableCheckMatch) test.disable_check = disableCheckMatch[1] === 'true'
      
      // Extract bindings first (simplified)
      const bindingsMatch = testContent.match(/bindings:\s*\{([^}]*)\}/);
      if (bindingsMatch) {
        const bindingContent = bindingsMatch[1]
        const keyMatch = bindingContent.match(/key:\s*"([^"]*)"/);
        const valMatch = bindingContent.match(/value:\s*\{([^}]*)\}/);
        if (keyMatch && valMatch) {
          test.bindings = {
            [keyMatch[1]]: { value: parseValue(valMatch[1]) }
          }
        }
      }
      
      // Extract eval_error
      const errorMatch = testContent.match(/eval_error:\s*\{([^}]*)\}/);
      if (errorMatch) {
        test.eval_error = parseValue(errorMatch[1])
      }
      
      // Extract value (handle nested braces)
      // Look for the pattern 'value {' or 'value:' that comes AFTER any bindings section
      const bindingsIndex = testContent.indexOf('bindings')
      let searchStart = 0
      
      if (bindingsIndex !== -1) {
        // If there are bindings, start searching after the bindings section
        // Find the end of the bindings block
        const bindingsStart = testContent.indexOf('{', bindingsIndex)
        if (bindingsStart !== -1) {
          let braceCount = 1
          let pos = bindingsStart + 1
          while (pos < testContent.length && braceCount > 0) {
            if (testContent[pos] === '{') braceCount++
            else if (testContent[pos] === '}') braceCount--
            pos++
          }
          searchStart = pos
        }
      }
      
      // Look for test-level 'value' patterns, avoiding field names like 'int64_value:'
      let valueStart = -1
      const searchText = testContent.substring(searchStart)
      
      // Use a regex that captures whitespace or start of string before 'value'
      const valueMatch = searchText.match(/(^|\s)value\s*[:{]/)
      
      if (valueMatch) {
        valueStart = searchStart + valueMatch.index + valueMatch[1].length
      }
      
      if (valueStart !== -1) {
        const braceStart = testContent.indexOf('{', valueStart)
        if (braceStart !== -1) {
          const valueContent = extractBalancedBraces(testContent, braceStart)
          if (valueContent) {
            test.value = parseValue(valueContent)
          }
        }
      }
      
      section.test.push(test)
    }
    
    result.section.push(section)
  }
  
  return result
}

function parseValue(content: string): any {
  const trimmed = content.trim()
  
  // Parse complex structures first (list_value, map_value)
  if (trimmed.includes('list_value')) {
    // Handle empty list  
    if (trimmed.includes('list_value {}')) {
      return { list_value: {} }
    }
    
    // Parse list values
    const values = []
    // Handle both 'values {' and 'values: {' formats
    const valuesMatch = trimmed.match(/values\s*:?\s*\{([^}]*)\}/g)
    if (valuesMatch) {
      for (const valueStr of valuesMatch) {
        const valueContent = valueStr.match(/values\s*:?\s*\{([^}]*)\}/)?.[1]
        if (valueContent) {
          const parsedValue = parseValue(valueContent)
          values.push(parsedValue)
        }
      }
    }
    return { list_value: { values } }
  }
  
  if (trimmed.includes('map_value')) {
    // Handle empty map
    if (trimmed.includes('map_value {}')) {
      return { map_value: {} }
    }
    
    // Parse map entries
    const entries = []
    let pos = 0
    while (true) {
      const entryStart = trimmed.indexOf('entries {', pos)
      if (entryStart === -1) break
      
      const braceStart = entryStart + 'entries '.length
      const entryContent = extractBalancedBraces(trimmed, braceStart)
      
      if (entryContent) {
        // Extract key and value using balanced brace extraction
        const keyStart = entryContent.indexOf('key:')
        if (keyStart !== -1) {
          const keyBraceStart = entryContent.indexOf('{', keyStart)
          if (keyBraceStart !== -1) {
            const keyContent = extractBalancedBraces(entryContent, keyBraceStart)
            
            const valueStart = entryContent.indexOf('value:', keyStart)
            if (valueStart !== -1) {
              const valueBraceStart = entryContent.indexOf('{', valueStart)
              if (valueBraceStart !== -1) {
                const valueContent = extractBalancedBraces(entryContent, valueBraceStart)
                
                if (keyContent && valueContent) {
                  const key = parseValue(keyContent)
                  const value = parseValue(valueContent)
                  entries.push({ key, value })
                }
              }
            }
          }
        }
      }
      
      pos = entryStart + 1
    }
    return { map_value: { entries } }
  }
  
  if (trimmed.includes('errors')) {
    const messageMatch = trimmed.match(/message:\s*"([^"]*)"/)
    return {
      errors: messageMatch ? [{ message: messageMatch[1] }] : []
    }
  }
  
  // Parse simple value types
  if (trimmed.includes('int64_value:')) {
    const match = trimmed.match(/int64_value:\s*(-?\d+)/)
    return match ? { int64_value: parseInt(match[1]) } : {}
  }
  
  if (trimmed.includes('uint64_value:')) {
    const match = trimmed.match(/uint64_value:\s*(\d+)/)
    return match ? { uint64_value: parseInt(match[1]) } : {}
  }
  
  if (trimmed.includes('double_value:')) {
    const match = trimmed.match(/double_value:\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)/)
    return match ? { double_value: parseFloat(match[1]) } : {}
  }
  
  if (trimmed.includes('string_value:')) {
    const match = trimmed.match(/string_value:\s*"([^"]*)"/)
    return match ? { string_value: processTextprotoString(match[1]) } : {}
  }
  
  if (trimmed.includes('bytes_value:')) {
    const match = trimmed.match(/bytes_value:\s*"([^"]*)"/)
    return match ? { bytes_value: match[1] } : {}
  }
  
  if (trimmed.includes('bool_value:')) {
    const match = trimmed.match(/bool_value:\s*(true|false)/)
    return match ? { bool_value: match[1] === 'true' } : {}
  }
  
  if (trimmed.includes('null_value:')) {
    return { null_value: null }
  }
  
  return {}
}

// Process textproto byte string with escape sequences
function processTextprotoByteString(str: string): Uint8Array {
  const bytes: number[] = []
  let i = 0
  
  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) {
      const next = str[i + 1]
      
      // Octal escape sequences \000 to \377
      if (/^[0-7]/.test(next)) {
        let octalDigits = ''
        let j = i + 1
        while (j < str.length && j < i + 4 && /^[0-7]$/.test(str[j])) {
          octalDigits += str[j]
          j++
        }
        if (octalDigits.length > 0) {
          bytes.push(parseInt(octalDigits, 8))
          i = j
          continue
        }
      }
      
      // Other escape sequences
      switch (next) {
        case 'n':
          bytes.push(10)
          i += 2
          continue
        case 't':
          bytes.push(9)
          i += 2
          continue
        case 'r':
          bytes.push(13)
          i += 2
          continue
        case '\\':
          bytes.push(92)
          i += 2
          continue
        case '"':
          bytes.push(34)
          i += 2
          continue
        case "'":
          bytes.push(39)
          i += 2
          continue
        default:
          // Unknown escape, add both characters
          bytes.push(str.charCodeAt(i))
          i++
          continue
      }
    }
    
    // Regular character
    bytes.push(str.charCodeAt(i))
    i++
  }
  
  return new Uint8Array(bytes)
}

function processTextprotoString(str: string): string {
  // First, collect all bytes from escape sequences
  const bytes: number[] = []
  let i = 0
  
  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) {
      const nextChar = str[i + 1]
      
      // Handle hex escape sequences like \xe2
      if (nextChar === 'x' && i + 4 <= str.length) {
        const hexStr = str.slice(i + 2, i + 4)
        if (/^[0-9a-fA-F]{2}$/.test(hexStr)) {
          bytes.push(parseInt(hexStr, 16))
          i += 4
          continue
        }
      }
      
      // Handle Unicode escape sequences \u270c
      if (nextChar === 'u' && i + 6 <= str.length) {
        const hexStr = str.slice(i + 2, i + 6)
        if (/^[0-9a-fA-F]{4}$/.test(hexStr)) {
          const codePoint = parseInt(hexStr, 16)
          // Convert Unicode code point to UTF-8 bytes
          const utf8Bytes = new TextEncoder().encode(String.fromCharCode(codePoint))
          bytes.push(...utf8Bytes)
          i += 6
          continue
        }
      }
      
      // Handle Unicode escape sequences \U0001F431
      if (nextChar === 'U' && i + 10 <= str.length) {
        const hexStr = str.slice(i + 2, i + 10)
        if (/^[0-9a-fA-F]{8}$/.test(hexStr)) {
          const codePoint = parseInt(hexStr, 16)
          // Convert Unicode code point to UTF-8 bytes
          const utf8Bytes = new TextEncoder().encode(String.fromCodePoint(codePoint))
          bytes.push(...utf8Bytes)
          i += 10
          continue
        }
      }
      
      // Handle octal escape sequences like \377, \012, etc.
      if (nextChar >= '0' && nextChar <= '7' && i + 3 <= str.length) {
        const octalStr = str.slice(i + 1, i + 4)
        if (/^[0-7]{3}$/.test(octalStr)) {
          const value = parseInt(octalStr, 8)
          if (value <= 255) {
            bytes.push(value)
            i += 4
            continue
          }
        }
        
        // Try 2-digit octal
        const octalStr2 = str.slice(i + 1, i + 3)
        if (/^[0-7]{2}$/.test(octalStr2)) {
          const value = parseInt(octalStr2, 8)
          bytes.push(value)
          i += 3
          continue
        }
        
        // Try 1-digit octal
        const value = parseInt(nextChar, 8)
        bytes.push(value)
        i += 2
        continue
      }
      
      // Handle other escape sequences
      switch (nextChar) {
        case 'a':
          bytes.push(7) // \a (bell/alert)
          i += 2
          continue
        case 'b':
          bytes.push(8) // \b (backspace)
          i += 2
          continue
        case 'f':
          bytes.push(12) // \f (form feed)
          i += 2
          continue
        case 'n':
          bytes.push(10) // \n
          i += 2
          continue
        case 'r':
          bytes.push(13) // \r
          i += 2
          continue
        case 't':
          bytes.push(9) // \t
          i += 2
          continue
        case 'v':
          bytes.push(11) // \v (vertical tab)
          i += 2
          continue
        case '\\':
          bytes.push(92) // \\
          i += 2
          continue
        case '"':
          bytes.push(34) // \"
          i += 2
          continue
        case "'":
          bytes.push(39) // \'
          i += 2
          continue
        default:
          // Unknown escape, treat as literal
          bytes.push(str.charCodeAt(i))
          i++
          continue
      }
    } else {
      // Regular character
      bytes.push(str.charCodeAt(i))
      i++
    }
  }
  
  // Convert bytes to UTF-8 string
  return new TextDecoder('utf-8').decode(new Uint8Array(bytes))
}

// Convert conformance test value to JavaScript value
export function conformanceValueToJS(value: ConformanceTestValue): any {
  if (value.int64_value !== undefined) return value.int64_value
  if (value.uint64_value !== undefined) return value.uint64_value
  if (value.double_value !== undefined) return value.double_value
  if (value.string_value !== undefined) return value.string_value
  if (value.bytes_value !== undefined) {
    // Convert byte string with escape sequences to Uint8Array
    return processTextprotoByteString(value.bytes_value)
  }
  if (value.bool_value !== undefined) return value.bool_value
  if (value.null_value !== undefined) return null
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
