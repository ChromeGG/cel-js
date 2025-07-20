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
    
    // Add proto message support with enum fields
    if (!context.TestAllTypes.__constructor) {
      context.TestAllTypes.__constructor = (fields: any = {}) => {
        const result: any = {}
        
        // Handle standalone_enum field
        if ('standalone_enum' in fields) {
          let enumValue = fields.standalone_enum
          if (typeof enumValue === 'number') {
            // Validate enum range (int32 range)
            const MAX_INT32 = 2147483647
            const MIN_INT32 = -2147483648
            if (enumValue > MAX_INT32 || enumValue < MIN_INT32) {
              throw new CelEvaluationError('enum value out of range')
            }
            
            if (isStrongMode) {
              result.standalone_enum = new CelEnum(nestedEnumTypeName, enumValue)
            } else {
              result.standalone_enum = enumValue
            }
          } else if (enumValue instanceof CelEnum) {
            result.standalone_enum = enumValue
          } else {
            result.standalone_enum = enumValue
          }
        } else {
          // Default value for enum fields
          if (isStrongMode) {
            result.standalone_enum = new CelEnum(nestedEnumTypeName, 0, 'FOO')
          } else {
            result.standalone_enum = 0
          }
        }
        
        // Handle repeated_nested_enum field
        if ('repeated_nested_enum' in fields) {
          result.repeated_nested_enum = fields.repeated_nested_enum
        } else {
          result.repeated_nested_enum = []
        }
        
        // Copy other fields
        Object.keys(fields).forEach(key => {
          if (key !== 'standalone_enum' && key !== 'repeated_nested_enum') {
            result[key] = fields[key]
          }
        })
        
        // Add all protobuf fields with default values if not already set
        const protoFields = [
          'single_int32', 'single_int64', 'single_uint32', 'single_uint64',
          'single_sint32', 'single_sint64', 'single_fixed32', 'single_fixed64',
          'single_sfixed32', 'single_sfixed64', 'single_float', 'single_double',
          'single_bool', 'single_string', 'single_bytes',
          'repeated_int32', 'repeated_int64', 'repeated_uint32', 'repeated_uint64',
          'repeated_sint32', 'repeated_sint64', 'repeated_fixed32', 'repeated_fixed64',
          'repeated_sfixed32', 'repeated_sfixed64', 'repeated_float', 'repeated_double',
          'repeated_bool', 'repeated_string', 'repeated_bytes',
          'single_nested_message', 'repeated_nested_message',
          'single_nested_enum', 'map_string_string', 'map_int32_enum',
          'map_bool_int64', 'single_any', 'single_duration', 'single_timestamp',
          'single_struct', 'single_value', 'list_value',
          'single_int32_wrapper', 'single_int64_wrapper', 'single_uint32_wrapper',
          'single_uint64_wrapper', 'single_float_wrapper', 'single_double_wrapper',
          'single_bool_wrapper', 'single_string_wrapper', 'single_bytes_wrapper'
        ]
        
        protoFields.forEach(field => {
          if (!(field in result)) {
            if (field.startsWith('repeated_') || field.startsWith('map_')) {
              result[field] = field.startsWith('map_') ? {} : []
            } else if (field.includes('_enum')) {
              result[field] = isStrongMode ? new CelEnum(nestedEnumTypeName, 0, 'FOO') : 0
            } else if (field.includes('_bool')) {
              result[field] = false
            } else if (field.includes('_string')) {
              result[field] = ''
            } else if (field.includes('_bytes')) {
              result[field] = new Uint8Array()
            } else if (field.includes('_int') || field.includes('_uint') || field.includes('_float') || field.includes('_double')) {
              result[field] = 0
            } else {
              result[field] = null
            }
          }
        })
        
        return result
      }
    }
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
}
