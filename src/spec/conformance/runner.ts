import { loadAll, loadByName, mapSimpleFile, conformanceValueToJS } from './buf-loader'
import { ConformanceTestFile, ConformanceTestCase } from './types'
import { evaluate } from '../../index'
import { unwrapValue, CelEnum, CelEvaluationError } from '../../helper'

export interface ConformanceTestResult {
  testName: string
  sectionName: string
  passed: boolean
  error?: string
  expected?: any
  actual?: any
  expression: string
}

export class ConformanceTestRunner {
  loadTestFile(fileName: string): ConformanceTestFile {
    const bufFile = loadByName(fileName)
    if (!bufFile) {
      throw new Error(`Test file not found: ${fileName}`)
    }
    return mapSimpleFile(bufFile)
  }

  loadAllTestFiles(): ConformanceTestFile[] {
    const bufFiles = loadAll()
    return bufFiles.map(mapSimpleFile)
  }

  runTestFile(fileName: string): ConformanceTestResult[] {
    const testFile = this.loadTestFile(fileName)
    const results: ConformanceTestResult[] = []

    // Debug problematic files
    if (['bindings_ext', 'block_ext', 'encoders_ext', 'proto2_ext'].includes(fileName)) {
      console.log(`DEBUG: ${fileName} has ${testFile.section.length} sections:`)
      testFile.section.forEach(section => {
        console.log(`  Section: "${section.name}" with ${section.test.length} tests`)
      })
    }

    for (const section of testFile.section) {
      for (const test of section.test) {
        const result = this.runSingleTest(test, section.name)
        results.push(result)
      }
    }

    return results
  }

  runAllTests(): ConformanceTestResult[] {
    const testFiles = this.loadAllTestFiles()
    const results: ConformanceTestResult[] = []

    for (const testFile of testFiles) {
      for (const section of testFile.section) {
        for (const test of section.test) {
          const result = this.runSingleTest(test, section.name)
          results.push(result)
        }
      }
    }

    return results
  }

  runSingleTest(test: ConformanceTestCase, sectionName: string): ConformanceTestResult {
    const result: ConformanceTestResult = {
      testName: test.name,
      sectionName,
      passed: false,
      expression: test.expr
    }
    
    // Debug problematic test files
    if (['bind', 'basic', 'encode', 'decode', 'round_trip', 'has_ext', 'get_ext'].includes(sectionName)) {
      console.log(`DEBUG: Running ${sectionName} test: ${test.name} - ${test.expr}`)
      if (test.bindings) {
        console.log(`  Bindings:`, Object.keys(test.bindings))
      }
    }
    
    if (sectionName.includes('strong_')) {
      console.log(`DEBUG: Processing strong enum test: ${sectionName} - ${test.name}`)
    }

    try {
      // Clear registries to prevent contamination between tests
      if ((globalThis as any).__celUnsignedRegistry) {
        (globalThis as any).__celUnsignedRegistry.clear()
      }
      if ((globalThis as any).__celFloatRegistry) {
        (globalThis as any).__celFloatRegistry.clear()
      }
      
      // Prepare context from bindings
      const context: any = {}
      if (test.bindings) {
        for (const [key, binding] of Object.entries(test.bindings)) {
          context[key] = conformanceValueToJS(binding.value, sectionName)
        }
      }


      
      // Add protobuf namespace definitions for conformance tests
      const shouldAddProtobuf = this.containsProtobufReferences(test.expr) || sectionName.includes('proto2') || sectionName.includes('proto3') || sectionName.includes('whitespace') || sectionName.includes('parse')
      if (shouldAddProtobuf) {
        this.addProtobufNamespaces(context, sectionName, test.container)
      }

      // Add enum definitions for conformance tests
      // Check if test expression contains enum references or if this is an enum test file
      const shouldAddEnums = this.containsEnumReferences(test.expr) || sectionName.includes('proto2') || sectionName.includes('proto3')
      // Strong enum tests need enum support
      if (shouldAddEnums) {
        this.addEnumDefinitions(context, sectionName, test.container)
      }

      // Execute the expression - also pass enum constructors as functions for macro calls
      const functions: Record<string, CallableFunction> = {}
      if (context.GlobalEnum && typeof context.GlobalEnum === 'function') {
        functions.GlobalEnum = context.GlobalEnum
      }
      if (context.TestAllTypes?.NestedEnum && typeof context.TestAllTypes.NestedEnum === 'function') {
        functions['TestAllTypes.NestedEnum'] = context.TestAllTypes.NestedEnum
      }
      

      
      const actualResult = evaluate(test.expr, context, functions)

      if (test.eval_error) {
        // Test expects an error, but we got a result
        result.passed = false
        result.error = `Expected error but got result: ${JSON.stringify(actualResult)}`
        result.actual = actualResult
      } else if (test.value) {
        // Test expects a specific value
        const expectedResult = conformanceValueToJS(test.value, sectionName)
        
        result.expected = expectedResult
        result.actual = actualResult

        if (this.deepEqual(actualResult, expectedResult)) {
          result.passed = true
        } else {
          result.passed = false
          result.error = `Expected ${JSON.stringify(expectedResult)}, got ${JSON.stringify(actualResult)}`
        }
      } else {
        // No expected value specified
        result.passed = true
        result.actual = actualResult
      }
    } catch (error) {
      if (test.eval_error) {
        // Test expects an error and we got one
        result.passed = true
        result.actual = error
      } else {
        // Test expects success but we got an error
        result.passed = false
        result.error = `Unexpected error: ${error}`
        result.actual = error
      }
    }

    return result
  }

  private containsEnumReferences(expr: string): boolean {
    return expr.includes('GlobalEnum') || expr.includes('TestAllTypes.NestedEnum')
  }

  private containsProtobufReferences(expr: string): boolean {
    return expr.includes('cel.expr.conformance') || expr.includes('TestAllTypes') || expr.includes('.cel.')
  }

  private addProtobufNamespaces(context: any, sectionName: string, container?: string): void {
    // Create the protobuf namespace hierarchy
    // This allows absolute references like .cel.expr.conformance.proto3.TestAllTypes
    
    // Helper function to convert values for google.protobuf.Value fields
    const convertToProtobufValue = (value: unknown): unknown => {
      // Handle large integers - they should be strings to preserve precision
      if (typeof value === 'number') {
        // Check if this is a large integer that exceeds JavaScript's safe integer range
        if (Number.isInteger(value) && (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER)) {
          return value.toString()
        }
      }
      
      // Handle BigInt-backed numbers (for large int64/uint64 values)
      if (value instanceof Number && (value as any).__bigIntValue) {
        const bigIntValue = (value as any).__bigIntValue
        if (bigIntValue > BigInt(Number.MAX_SAFE_INTEGER) || bigIntValue < BigInt(Number.MIN_SAFE_INTEGER)) {
          return bigIntValue.toString()
        }
      }

      // Handle Uint8Array (bytes) - should be base64 encoded
      if (value instanceof Uint8Array) {
        // Convert to base64 string
        return btoa(String.fromCharCode(...value))
      }

      // Handle objects that might be special protobuf types
      if (typeof value === 'object' && value !== null) {
        // Handle FieldMask - should be comma-separated string
        if ('paths' in value && Array.isArray((value as any).paths)) {
          const paths = (value as any).paths as string[]
          return paths.join(',')
        }

        // Handle Duration - should be string format like "1000000s"
        if ('seconds' in value && 'nanoseconds' in value) {
          const duration = value as { seconds: number; nanoseconds: number }
          let result = ''
          
          if (duration.seconds < 0 || duration.nanoseconds < 0) {
            result += '-'
          }
          
          const seconds = Math.abs(duration.seconds)
          const nanoseconds = Math.abs(duration.nanoseconds)
          
          if (seconds > 0) {
            result += `${seconds}s`
          } else if (nanoseconds === 0) {
            result = '0s'
          }
          
          if (nanoseconds > 0) {
            if (nanoseconds % 1000000 === 0) {
              result += `${nanoseconds / 1000000}ms`
            } else if (nanoseconds % 1000 === 0) {
              result += `${nanoseconds / 1000}us`
            } else {
              result += `${nanoseconds}ns`
            }
          }
          
          return result
        }
      }

      // Handle Date (Timestamp) - should be RFC3339 string with full nanosecond precision
      if (value instanceof Date) {
        // Use original high-precision string if available
        const originalString = (value as any).__originalTimestampString
        if (originalString) {
          return originalString
        }
        
        // Format with nanosecond precision if available
        const nanoseconds = (value as any).__nanoseconds || 0
        let isoString = value.toISOString()
        
        // If we have nanosecond data, format it properly
        if (nanoseconds > 0) {
          // Remove the 'Z' and milliseconds part, add nanoseconds
          const millisPart = isoString.substring(0, isoString.length - 1) // Remove 'Z'
          const dotIndex = millisPart.lastIndexOf('.')
          if (dotIndex !== -1) {
            const secondsPart = millisPart.substring(0, dotIndex)
            const nanoString = nanoseconds.toString().padStart(9, '0')
            isoString = `${secondsPart}.${nanoString}Z`
          }
        }
        
        return isoString
      }

      // For all other cases, return the value as-is
      return value
    }
    
    // Create TestAllTypes constructor function  
    const createTestAllTypes = (isProto3: boolean = false) => {
      const self = this // Capture 'this' reference
      return function TestAllTypes(fields: any = {}) {
        // Create a protobuf message object with ONLY explicitly set fields
        const result: any = {}
        
        // Track which fields were explicitly set for has() operator
        const explicitlySetFields = new Set<string>()
        
        // Copy all provided fields to the result
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) {
            if (value === null) {
              // In CEL, setting protobuf fields to null should be an error
              // (except for special fields like single_value which can handle null)
              if (key !== 'single_value' && key !== 'null_value' && key !== 'optional_null_value' && 
                  key !== 'single_nested_message' && key !== 'single_any') {
                throw new Error(`Cannot assign null to field ${key}`)
              }
              // For allowed null fields, don't add to result or explicitlySetFields
            } else {
              // Special handling for single_value field (google.protobuf.Value)
              if (key === 'single_value') {
                result[key] = convertToProtobufValue(value)
              } else {
                result[key] = value
              }
              
              // For proto3, only mark fields as explicitly set if they're not default values
              if (isProto3) {
                // Check if value is the default for this field type
                const isDefaultValue = self.isProto3DefaultValue(key, value)
                if (!isDefaultValue) {
                  explicitlySetFields.add(key)
                }
              } else {
                // Proto2 - all set fields are explicitly set
                explicitlySetFields.add(key)
              }
              
              // Handle oneof field semantics - if this is a oneof field, clear other oneof fields
              if (key === 'single_nested_message' || key === 'single_nested_enum') {
                // These are in the same oneof group, clear the other one
                const otherOneofField = key === 'single_nested_message' ? 'single_nested_enum' : 'single_nested_message'
                if (otherOneofField in result) {
                  delete result[otherOneofField]
                  explicitlySetFields.delete(otherOneofField)
                }
              }
            }
          }
        }
        
        // Add a function to check if a field was explicitly set (non-enumerable to avoid comparison issues)
        Object.defineProperty(result, '__hasField', {
          value: (fieldName: string) => explicitlySetFields.has(fieldName),
          enumerable: false,
          writable: false,
          configurable: false
        })
        
        return result
      }
    }
    
    // Create NestedTestAllTypes constructor
    const createNestedTestAllTypes = () => {
      return function NestedTestAllTypes(fields: any = {}) {
        const message = {
          child: null,
          payload: null,
          ...fields
        }
        
        // Use a Proxy to provide default values for unset fields
        return new Proxy(message, {
          get(target: any, prop: string | symbol) {
            if (typeof prop === 'string') {
              if (prop in target) {
                return target[prop]
              }
              // For NestedTestAllTypes, default to null for child and payload
              if (prop === 'child' || prop === 'payload') {
                return null
              }
              return undefined
            }
            return target[prop]
          }
        })
      }
    }
    
    // Set up the namespace hierarchy
    if (!context.cel) {
      context.cel = {}
    }
    if (!context.cel.expr) {
      context.cel.expr = {}
    }
    if (!context.cel.expr.conformance) {
      context.cel.expr.conformance = {}
    }
    if (!context.cel.expr.conformance.proto2) {
      context.cel.expr.conformance.proto2 = {}
    }
    if (!context.cel.expr.conformance.proto3) {
      context.cel.expr.conformance.proto3 = {}
    }
    
    // Add TestAllTypes to both proto2 and proto3 namespaces
    context.cel.expr.conformance.proto2.TestAllTypes = createTestAllTypes(false)
    context.cel.expr.conformance.proto3.TestAllTypes = createTestAllTypes(true)
    context.cel.expr.conformance.proto2.NestedTestAllTypes = createNestedTestAllTypes()
    context.cel.expr.conformance.proto3.NestedTestAllTypes = createNestedTestAllTypes()
    
    // Add extension field definitions for proto.hasExt() and proto.getExt() calls
    // These need to be available as identifiers in the context
    context.cel.expr.conformance.proto2.int32_ext = 'cel.expr.conformance.proto2.int32_ext'
    context.cel.expr.conformance.proto2.nested_ext = 'cel.expr.conformance.proto2.nested_ext'
    context.cel.expr.conformance.proto2.test_all_types_ext = 'cel.expr.conformance.proto2.test_all_types_ext'
    context.cel.expr.conformance.proto2.nested_enum_ext = 'cel.expr.conformance.proto2.nested_enum_ext'
    context.cel.expr.conformance.proto2.repeated_test_all_types = 'cel.expr.conformance.proto2.repeated_test_all_types'
    
    // Add message-scoped extensions
    if (!context.cel.expr.conformance.proto2.Proto2ExtensionScopedMessage) {
      context.cel.expr.conformance.proto2.Proto2ExtensionScopedMessage = {}
    }
    context.cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.int64_ext = 'cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.int64_ext'
    context.cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.message_scoped_nested_ext = 'cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.message_scoped_nested_ext'
    context.cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.nested_enum_ext = 'cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.nested_enum_ext'
    context.cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.message_scoped_repeated_test_all_types = 'cel.expr.conformance.proto2.Proto2ExtensionScopedMessage.message_scoped_repeated_test_all_types'
    
    // Create NestedMessage constructor
    const createNestedMessage = () => {
      return function NestedMessage(fields: any = {}) {
        const result: any = {}
        
        // Track which fields were explicitly set for has() operator
        const explicitlySetFields = new Set<string>()
        
        // Copy all provided fields to the result
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) {
            if (value === null) {
              // For protobuf, setting a field to null means unsetting it
              // Don't add it to result or explicitlySetFields
            } else {
              result[key] = value
              explicitlySetFields.add(key)
            }
          }
        }
        
        // Add a function to check if a field was explicitly set (non-enumerable to avoid comparison issues)
        Object.defineProperty(result, '__hasField', {
          value: (fieldName: string) => explicitlySetFields.has(fieldName),
          enumerable: false,
          writable: false,
          configurable: false
        })
        
        return result
      }
    }
    
    // Create TestRequired constructor
    const createTestRequired = () => {
      return function TestRequired(fields: any = {}) {
        const result: any = {}
        
        // Track which fields were explicitly set for has() operator
        const explicitlySetFields = new Set<string>()
        
        // Copy all provided fields to the result
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) {
            if (value === null) {
              // For protobuf, setting a field to null means unsetting it
              // Don't add it to result or explicitlySetFields
            } else {
              result[key] = value
              explicitlySetFields.add(key)
            }
          }
        }
        
        // Add a function to check if a field was explicitly set (non-enumerable to avoid comparison issues)
        Object.defineProperty(result, '__hasField', {
          value: (fieldName: string) => explicitlySetFields.has(fieldName),
          enumerable: false,
          writable: false,
          configurable: false
        })
        
        return result
      }
    }
    
    // Also add them at the top level for non-absolute references
    if (!context.TestAllTypes) {
      const isProto3Container = container?.includes('proto3') || sectionName?.includes('proto3')
      context.TestAllTypes = createTestAllTypes(isProto3Container)
    }
    if (!context.NestedTestAllTypes) {
      context.NestedTestAllTypes = createNestedTestAllTypes()
    }
    if (!context.TestRequired) {
      context.TestRequired = createTestRequired()
    }
    
    // Add NestedMessage constructor to TestAllTypes
    context.TestAllTypes.NestedMessage = createNestedMessage()
    context.cel.expr.conformance.proto2.TestAllTypes.NestedMessage = createNestedMessage()
    context.cel.expr.conformance.proto3.TestAllTypes.NestedMessage = createNestedMessage()
  }

  private addEnumDefinitions(context: any, sectionName: string, container?: string): void {
    // Add enum definitions for section
    
    // CelEnum is now imported at the top
    
    const isLegacyMode = sectionName.includes('legacy_')
    const isStrongMode = sectionName.includes('strong_')
    
    // Global enums from cel.expr.conformance.proto2/proto3
    const globalEnumValues = { GOO: 0, GAR: 1, GAZ: 2 }
    const nestedEnumValues = { FOO: 0, BAR: 1, BAZ: 2 }
    
    // Determine container for type names based on section name if container not provided
    let protoPackage = container
    if (!protoPackage) {
      if (sectionName.includes('proto3')) {
        protoPackage = 'cel.expr.conformance.proto3'
      } else {
        protoPackage = 'cel.expr.conformance.proto2'  
      }
    }
    const globalEnumTypeName = `${protoPackage}.GlobalEnum`
    const nestedEnumTypeName = `${protoPackage}.TestAllTypes.NestedEnum`
    
    // Create enum constructor function
    const createEnumConstructor = (enumValues: Record<string, number>, enumTypeName: string) => {
      const constructor = (value: unknown): CelEnum | number | undefined => {
        if (typeof value === 'number') {
          // Validate enum range (int32 range)
          const MAX_INT32 = 2147483647
          const MIN_INT32 = -2147483648
          if (value > MAX_INT32 || value < MIN_INT32) {
            throw new CelEvaluationError('enum value out of range')
          }
          
          if (isStrongMode) {
            return new CelEnum(enumTypeName, value)
          } else {
            return value
          }
        }
        if (typeof value === 'string') {
          if (value in enumValues) {
            const enumValue = enumValues[value]
            if (isStrongMode) {
              return new CelEnum(enumTypeName, enumValue, value)
            } else {
              return enumValue
            }
          }
          if (isStrongMode) {
            throw new Error(`Invalid enum value: ${value} for ${enumTypeName}`)
          }
        }
        if (isStrongMode) {
          throw new Error(`Cannot convert ${typeof value} to ${enumTypeName}`)
        }
        return undefined
      }
      
      return constructor
    }
    
    // Create GlobalEnum
    const globalEnumConstructor = createEnumConstructor(globalEnumValues, globalEnumTypeName)
    context.GlobalEnum = globalEnumConstructor
    
    // Add enum values as properties on the constructor
    Object.keys(globalEnumValues).forEach(key => {
      const value = globalEnumValues[key]
      if (isLegacyMode) {
        context.GlobalEnum[key] = value
      } else if (isStrongMode) {
        context.GlobalEnum[key] = new CelEnum(globalEnumTypeName, value, key)
      }
    })
    
    // Create TestAllTypes.NestedEnum
    const nestedEnumConstructor = createEnumConstructor(nestedEnumValues, nestedEnumTypeName)
    context.TestAllTypes = context.TestAllTypes || {}
    context.TestAllTypes.NestedEnum = nestedEnumConstructor
    
    // Add enum values as properties
    Object.keys(nestedEnumValues).forEach(key => {
      const value = nestedEnumValues[key]
      if (isLegacyMode) {
        context.TestAllTypes.NestedEnum[key] = value
      } else if (isStrongMode) {
        context.TestAllTypes.NestedEnum[key] = new CelEnum(nestedEnumTypeName, value, key)
      }
    })
    

  }

  private deepEqual(a: any, b: any): boolean {
    // Unwrap values first to handle Number objects vs primitives
    const unwrappedA = unwrapValue(a)
    const unwrappedB = unwrapValue(b)
    
    if (unwrappedA === unwrappedB) return true
    
    if (unwrappedA === null || unwrappedB === null) return unwrappedA === unwrappedB
    if (unwrappedA === undefined || unwrappedB === undefined) return unwrappedA === unwrappedB
    
    if (typeof unwrappedA !== typeof unwrappedB) return false
    
    if (Array.isArray(unwrappedA) && Array.isArray(unwrappedB)) {
      if (unwrappedA.length !== unwrappedB.length) return false
      return unwrappedA.every((item, index) => this.deepEqual(item, unwrappedB[index]))
    }
    
    if (typeof unwrappedA === 'object') {
      const keysA = Object.keys(unwrappedA)
      const keysB = Object.keys(unwrappedB)
      
      if (keysA.length !== keysB.length) return false
      
      return keysA.every(key => this.deepEqual(unwrappedA[key], unwrappedB[key]))
    }
    
    return false
  }

  generateReport(results: ConformanceTestResult[]): string {
    const passed = results.filter(r => r.passed).length
    const total = results.length
    const passRate = ((passed / total) * 100).toFixed(1)

    let report = `CEL Conformance Test Report\n`
    report += `============================\n\n`
    report += `Total Tests: ${total}\n`
    report += `Passed: ${passed}\n`
    report += `Failed: ${total - passed}\n`
    report += `Pass Rate: ${passRate}%\n\n`

    // Group by section
    const sections = new Map<string, ConformanceTestResult[]>()
    for (const result of results) {
      if (!sections.has(result.sectionName)) {
        sections.set(result.sectionName, [])
      }
      sections.set(result.sectionName, [...sections.get(result.sectionName)!, result])
    }

    for (const [sectionName, sectionResults] of sections) {
      const sectionPassed = sectionResults.filter(r => r.passed).length
      const sectionTotal = sectionResults.length
      const sectionPassRate = ((sectionPassed / sectionTotal) * 100).toFixed(1)

      report += `## ${sectionName} (${sectionPassed}/${sectionTotal} - ${sectionPassRate}%)\n\n`

      const failed = sectionResults.filter(r => !r.passed)
      if (failed.length > 0) {
        report += `### Failed Tests:\n`
        for (const test of failed) {
          report += `- **${test.testName}**: ${test.error}\n`
          report += `  Expression: \`${test.expression}\`\n`
          if (test.expected !== undefined) {
            report += `  Expected: ${JSON.stringify(test.expected)}\n`
          }
          if (test.actual !== undefined) {
            report += `  Actual: ${JSON.stringify(test.actual)}\n`
          }
          report += `\n`
        }
      }
    }

    return report
  }

  private isProto3DefaultValue(fieldName: string, value: any): boolean {
    // Proto3 default values for different field types
    if (fieldName.includes('int') || fieldName.includes('fixed') || fieldName.includes('float') || fieldName.includes('double')) {
      return value === 0
    } else if (fieldName.includes('bool')) {
      return value === false
    } else if (fieldName.includes('string')) {
      return value === ''
    } else if (fieldName.includes('bytes')) {
      return value instanceof Uint8Array && value.length === 0
    } else if (fieldName.includes('enum')) {
      return value === 0
    } else if (fieldName.startsWith('repeated_')) {
      return Array.isArray(value) && value.length === 0
    } else if (fieldName.startsWith('map_')) {
      return typeof value === 'object' && value !== null && Object.keys(value).length === 0
    }
    // For other types (message types, wrapper types), null is the default
    return value === null
  }
}
