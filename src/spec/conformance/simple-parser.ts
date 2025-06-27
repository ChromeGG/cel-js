import { ConformanceTestFile, ConformanceTestValue } from './types'

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
      
      const exprMatch = testContent.match(/expr:\s*"([^"\\]*(\\.[^"\\]*)*)"/);
      if (!exprMatch) {
        // Try single quotes if double quotes didn't work
        const exprMatchSingle = testContent.match(/expr:\s*'([^'\\]*(\\.[^'\\]*)*)'/);
        if (exprMatchSingle) test.expr = exprMatchSingle[1];
      } else {
        test.expr = exprMatch[1];
      }
      
      const disableCheckMatch = testContent.match(/disable_check:\s*(true|false)/);
      if (disableCheckMatch) test.disable_check = disableCheckMatch[1] === 'true'
      
      // Extract value
      const valueMatch = testContent.match(/value:\s*\{([^}]*)\}/);
      if (valueMatch) {
        test.value = parseValue(valueMatch[1])
      }
      
      // Extract eval_error
      const errorMatch = testContent.match(/eval_error:\s*\{([^}]*)\}/);
      if (errorMatch) {
        test.eval_error = parseValue(errorMatch[1])
      }
      
      // Extract bindings (simplified)
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
      
      section.test.push(test)
    }
    
    result.section.push(section)
  }
  
  return result
}

function parseValue(content: string): any {
  const trimmed = content.trim()
  
  // Parse different value types
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
    return match ? { string_value: match[1] } : {}
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
  
  if (trimmed.includes('list_value:')) {
    // Handle empty list
    if (trimmed.includes('list_value: {}')) {
      return { list_value: {} }
    }
    
    // Parse list values
    const values = []
    const valuesMatch = trimmed.match(/values:\s*\{([^}]*)\}/g)
    if (valuesMatch) {
      for (const valueStr of valuesMatch) {
        const valueContent = valueStr.match(/values:\s*\{([^}]*)\}/)?.[1]
        if (valueContent) {
          const parsedValue = parseValue(valueContent)
          values.push(parsedValue)
        }
      }
    }
    return { list_value: { values } }
  }
  
  if (trimmed.includes('map_value:')) {
    // Handle empty map
    if (trimmed.includes('map_value: {}')) {
      return { map_value: {} }
    }
    
    // Parse map entries
    const entries = []
    const entriesMatch = trimmed.match(/entries\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g)
    if (entriesMatch) {
      for (const entryStr of entriesMatch) {
        const entryContent = entryStr.match(/entries\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/)?.[1]
        if (entryContent) {
          const keyMatch = entryContent.match(/key:\s*\{([^}]*)\}/)
          const valueMatch = entryContent.match(/value:\s*\{([^}]*)\}/)
          
          if (keyMatch && valueMatch) {
            const key = parseValue(keyMatch[1])
            const value = parseValue(valueMatch[1])
            entries.push({ key, value })
          }
        }
      }
    }
    return { map_value: { entries } }
  }
  
  if (trimmed.includes('errors')) {
    const messageMatch = trimmed.match(/message:\s*"([^"]*)"/)
    return {
      errors: messageMatch ? [{ message: messageMatch[1] }] : []
    }
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
