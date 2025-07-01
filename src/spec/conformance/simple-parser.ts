import { ConformanceTestFile, ConformanceTestValue } from './types'
import { CelEnum } from '../../helper'

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
      
      // Extract expression with proper escape handling, including multi-line expressions
      let rawExpr = '';
      
      // Handle multi-line expressions that span multiple quoted strings
      const exprStartMatch = testContent.match(/expr:\s*$/m);
      if (exprStartMatch) {
        // Multi-line expression - collect all quoted strings
        const lines = testContent.split('\n');
        let inExpr = false;
        let braceDepth = 0;
        
        for (const line of lines) {
          if (line.match(/expr:\s*$/)) {
            inExpr = true;
            continue;
          }
          
          if (inExpr) {
            // Check if this line starts a new field (not indented or starts with field name)
            if (line.match(/^\s*[a-zA-Z_]+:\s*/) && braceDepth === 0) {
              break;
            }
            
            // Extract quoted strings from this line
            const quotedMatches = line.matchAll(/"((?:[^"\\]|\\.)*)"/g);
            for (const match of quotedMatches) {
              rawExpr += match[1];
            }
            
            // Count braces for nested structures
            braceDepth += (line.match(/\{/g) || []).length;
            braceDepth -= (line.match(/\}/g) || []).length;
          }
        }
      } else {
        // Single-line expression
        const exprDoubleQuoteMatch = testContent.match(/expr:\s*"((?:[^"\\]|\\.)*)"/);
        const exprSingleQuoteMatch = testContent.match(/expr:\s*'((?:[^'\\]|\\.)*)'/);
        
        if (exprDoubleQuoteMatch) {
          rawExpr = exprDoubleQuoteMatch[1];
        } else if (exprSingleQuoteMatch) {
          rawExpr = exprSingleQuoteMatch[1];
        }
      }
      
      if (rawExpr) {
        // Process escape sequences for textproto strings
        test.expr = rawExpr.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      }
      
      const disableCheckMatch = testContent.match(/disable_check:\s*(true|false)/);
      if (disableCheckMatch) test.disable_check = disableCheckMatch[1] === 'true'
      
      // Extract bindings with a more robust parser that handles nested braces
      let bindingsStartIndex = testContent.indexOf('bindings:')
      if (bindingsStartIndex === -1) {
        bindingsStartIndex = testContent.indexOf('bindings {')
      }
      if (bindingsStartIndex !== -1) {
        // Find the opening brace after bindings:
        const openBraceIndex = testContent.indexOf('{', bindingsStartIndex)
        if (openBraceIndex !== -1) {
          // Count braces to find the matching closing brace
          let braceCount = 1
          let currentIndex = openBraceIndex + 1
          let closeBraceIndex = -1
          
          while (currentIndex < testContent.length && braceCount > 0) {
            const char = testContent[currentIndex]
            if (char === '{') braceCount++
            else if (char === '}') braceCount--
            
            if (braceCount === 0) {
              closeBraceIndex = currentIndex
              break
            }
            currentIndex++
          }
          
          if (closeBraceIndex !== -1) {
            const bindingContent = testContent.slice(openBraceIndex + 1, closeBraceIndex)
            const keyMatch = bindingContent.match(/key:\s*"([^"]*)"/);
            
            // Find value section more carefully - handle both 'value:' and 'value {' formats
            let valueIndex = bindingContent.indexOf('value:')
            if (valueIndex === -1) {
              valueIndex = bindingContent.indexOf('value {')
            }
            if (keyMatch && valueIndex !== -1) {
              const valueStart = bindingContent.indexOf('{', valueIndex)
              if (valueStart !== -1) {
                // Count braces for the value section
                let valueBraceCount = 1
                let valueCurrentIndex = valueStart + 1
                let valueCloseIndex = -1
                
                while (valueCurrentIndex < bindingContent.length && valueBraceCount > 0) {
                  const char = bindingContent[valueCurrentIndex]
                  if (char === '{') valueBraceCount++
                  else if (char === '}') valueBraceCount--
                  
                  if (valueBraceCount === 0) {
                    valueCloseIndex = valueCurrentIndex
                    break
                  }
                  valueCurrentIndex++
                }
                
                if (valueCloseIndex !== -1) {
                  const valueContent = bindingContent.slice(valueStart + 1, valueCloseIndex)
                  // Handle nested value structures like: value { value { object_value { ... } } }
                  let parsedValue = parseValue(valueContent)
                  
                  // If the parsed value has a nested 'value' field, unwrap it
                  if (parsedValue && typeof parsedValue === 'object' && 'value' in parsedValue) {
                    parsedValue = parsedValue.value
                  }
                  
                  test.bindings = {
                    [keyMatch[1]]: { value: parsedValue }
                  }
                }
              }
            }
          }
        }
      }
      
      // Extract eval_error (handle multiline)
      const errorIndex = testContent.indexOf('eval_error')
      if (errorIndex !== -1) {
        const errorStart = testContent.indexOf('{', errorIndex)
        if (errorStart !== -1) {
          const errorContent = extractBalancedBraces(testContent, errorStart)
          if (errorContent) {
            test.eval_error = parseValue(errorContent)
          }
        }
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
  
  // Handle nested value structures first
  if (trimmed.match(/^\s*value\s*\{/)) {
    // This is a nested value { ... } structure
    const braceStart = trimmed.indexOf('{')
    if (braceStart !== -1) {
      const nestedContent = extractBalancedBraces(trimmed, braceStart)
      if (nestedContent) {
        return { value: parseValue(nestedContent) }
      }
    }
  }
  
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
    const match = trimmed.match(/double_value:\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?|Infinity|-Infinity|NaN)/)
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
  
  if (trimmed.includes('type_value:')) {
    const match = trimmed.match(/type_value:\s*"([^"]*)"/)
    return match ? { type_value: match[1] } : {}
  }
  
  if (trimmed.includes('enum_value')) {
    // Parse enum_value with type and value fields
    const typeMatch = trimmed.match(/type:\s*"([^"]*)"/)
    const valueMatch = trimmed.match(/value:\s*(-?\d+)/)
    if (typeMatch && valueMatch) {
      return {
        enum_value: {
          type: typeMatch[1],
          value: parseInt(valueMatch[1])
        }
      }
    }
    return {}
  }
  
  if (trimmed.includes('null_value:')) {
    return { null_value: null }
  }
  
  if (trimmed.includes('object_value')) {
    // Parse object_value which contains protobuf messages
    // Handle the case where object_value has a nested structure
    const objectValueStart = trimmed.indexOf('object_value')
    if (objectValueStart !== -1) {
      const braceStart = trimmed.indexOf('{', objectValueStart)
      if (braceStart !== -1) {
        const objectValueContent = extractBalancedBraces(trimmed, braceStart)
        if (objectValueContent) {
          // Look for type URL and proto content pattern
          const typeUrlMatch = objectValueContent.match(/\[([^\]]+)\]\s*\{([^}]*)\}/)
          if (typeUrlMatch) {
            const typeUrl = typeUrlMatch[1]
            const protoContent = typeUrlMatch[2].trim()
            
            // Extract field values from proto content
            const protoObj: any = {}
            
            // Parse field assignments like "standalone_enum: BAR" or "single_int64: 17"
            // Handle multiline content by splitting on newlines first
            const lines = protoContent.split('\n').map(line => line.trim()).filter(line => line)
            for (const line of lines) {
              const fieldMatch = line.match(/(\w+):\s*(.+)/)
              if (fieldMatch) {
                const fieldName = fieldMatch[1]
                const fieldValue = fieldMatch[2].trim()
                
                // Handle enum values (they appear as bare identifiers like BAR, FOO)
                if (/^[A-Z_]+$/.test(fieldValue)) {
                  // This is likely an enum value name
                  protoObj[fieldName] = fieldValue
                } else if (/^-?\d+$/.test(fieldValue)) {
                  // This is a numeric value
                  protoObj[fieldName] = parseInt(fieldValue)
                } else if (fieldValue === 'true' || fieldValue === 'false') {
                  protoObj[fieldName] = fieldValue === 'true'
                } else {
                  // String or other value
                  protoObj[fieldName] = fieldValue
                }
              }
            }
            
            return {
              object_value: {
                typeUrl,
                value: protoObj
              }
            }
          }
        }
      }
    }
    
    return { object_value: {} }
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
  let result = ''
  let i = 0
  let bytes: number[] = []
  
  // Helper function to process accumulated UTF-8 bytes
  const flushBytes = () => {
    if (bytes.length > 0) {
      // Convert UTF-8 byte sequence to proper Unicode string
      const buffer = new Uint8Array(bytes)
      const decoder = new TextDecoder('utf-8')
      result += decoder.decode(buffer)
      bytes = []
    }
  }
  
  while (i < str.length) {
    if (str[i] === '\\' && i + 1 < str.length) {
      const nextChar = str[i + 1]
      
      // Handle hex escape sequences like \xe2 (these are byte values)
      if (nextChar === 'x' && i + 4 <= str.length) {
        const hexStr = str.slice(i + 2, i + 4)
        if (/^[0-9a-fA-F]{2}$/.test(hexStr)) {
          // Accumulate bytes for UTF-8 decoding
          const byteValue = parseInt(hexStr, 16)
          bytes.push(byteValue)
          i += 4
          continue
        }
      }
      
      // Handle Unicode escape sequences \u270c (these are Unicode code points)
      if (nextChar === 'u' && i + 6 <= str.length) {
        const hexStr = str.slice(i + 2, i + 6)
        if (/^[0-9a-fA-F]{4}$/.test(hexStr)) {
          flushBytes() // Flush any accumulated bytes first
          const codePoint = parseInt(hexStr, 16)
          result += String.fromCharCode(codePoint)
          i += 6
          continue
        }
      }
      
      // Handle Unicode escape sequences \U0001F431 (these are Unicode code points)
      if (nextChar === 'U' && i + 10 <= str.length) {
        const hexStr = str.slice(i + 2, i + 10)
        if (/^[0-9a-fA-F]{8}$/.test(hexStr)) {
          flushBytes() // Flush any accumulated bytes first
          const codePoint = parseInt(hexStr, 16)
          result += String.fromCodePoint(codePoint)
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
            flushBytes()
            result += String.fromCharCode(value)
            i += 4
            continue
          }
        }
        
        // Try 2-digit octal
        const octalStr2 = str.slice(i + 1, i + 3)
        if (/^[0-7]{2}$/.test(octalStr2)) {
          const value = parseInt(octalStr2, 8)
          flushBytes()
          result += String.fromCharCode(value)
          i += 3
          continue
        }
        
        // Try 1-digit octal
        const value = parseInt(nextChar, 8)
        flushBytes()
        result += String.fromCharCode(value)
        i += 2
        continue
      }
      
      // Handle other escape sequences
      switch (nextChar) {
        case 'a':
          flushBytes()
          result += '\x07' // \a (bell/alert)
          i += 2
          continue
        case 'b':
          flushBytes()
          result += '\b' // \b (backspace)
          i += 2
          continue
        case 'f':
          flushBytes()
          result += '\f' // \f (form feed)
          i += 2
          continue
        case 'n':
          flushBytes()
          result += '\n' // \n
          i += 2
          continue
        case 'r':
          flushBytes()
          result += '\r' // \r
          i += 2
          continue
        case 't':
          flushBytes()
          result += '\t' // \t
          i += 2
          continue
        case 'v':
          flushBytes()
          result += '\v' // \v (vertical tab)
          i += 2
          continue
        case '\\':
          flushBytes()
          result += '\\' // \\
          i += 2
          continue
        case '"':
          flushBytes()
          result += '"' // \"
          i += 2
          continue
        case "'":
          flushBytes()
          result += "'" // \'
          i += 2
          continue
        default:
          // Unknown escape, treat as literal
          flushBytes()
          result += str[i]
          i++
          continue
      }
    } else {
      // Regular character (including Unicode characters)
      flushBytes() // Flush any accumulated bytes first
      result += str[i]
      i++
    }
  }
  
  flushBytes() // Flush any remaining bytes
  return result
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
  if (value.type_value !== undefined) return value.type_value
  if (value.enum_value !== undefined) {
    return new CelEnum(value.enum_value.type, value.enum_value.value)
  }
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
  if (value.object_value !== undefined) {
    // Handle protobuf message objects
    const obj = value.object_value as any
    if (obj.typeUrl && obj.value) {
      const result: any = { ...obj.value }
      
      // Check for special Google protobuf types
      if (obj.typeUrl.includes('google.protobuf.Duration')) {
        // Create a Duration object with necessary methods
        const seconds = result.seconds || 0
        const nanos = result.nanos || 0
        const duration = {
          seconds,
          nanos,
          getMilliseconds() {
            // Return millisecond component (not total milliseconds)
            return Math.floor(nanos / 1000000)
          },
          getSeconds() {
            return seconds
          },
          getNanos() {
            return nanos
          }
        }
        return duration
      }
      
      if (obj.typeUrl.includes('google.protobuf.Timestamp')) {
        // Create a Timestamp object with necessary methods
        const seconds = result.seconds || 0
        const nanos = result.nanos || 0
        const timestamp = {
          seconds,
          nanos,
          getSeconds() {
            return seconds
          },
          getNanos() {
            return nanos
          }
        }
        return timestamp
      }
      
      // Handle TestAllTypes protobuf messages
      if (obj.typeUrl.includes('TestAllTypes')) {
        // For TestAllTypes messages, create an object with proper defaults
        const testAllTypesObj: any = {}
        
        // Set defaults for known fields
        testAllTypesObj.standalone_enum = result.standalone_enum !== undefined ? result.standalone_enum : 0
        testAllTypesObj.repeated_nested_enum = result.repeated_nested_enum || []
        
        // Copy other fields
        for (const [key, value] of Object.entries(result)) {
          if (key !== 'standalone_enum' && key !== 'repeated_nested_enum') {
            testAllTypesObj[key] = value
          }
        }
        
        return testAllTypesObj
      }
      
      // Handle enum fields - convert enum names to their numeric values
      for (const [fieldName, fieldValue] of Object.entries(result)) {
        if (typeof fieldValue === 'string' && /^[A-Z_]+$/.test(fieldValue)) {
          // This looks like an enum value name, convert to numeric value
          if (fieldValue === 'FOO') result[fieldName] = 0
          else if (fieldValue === 'BAR') result[fieldName] = 1  
          else if (fieldValue === 'BAZ') result[fieldName] = 2
          else if (fieldValue === 'GAR') result[fieldName] = 1
          else if (fieldValue === 'GAZ') result[fieldName] = 2
          else if (fieldValue === 'GOO') result[fieldName] = 0
          // Add more enum mappings as needed
        }
      }
      
      return result
    }
    return obj
  }
  return undefined
}
