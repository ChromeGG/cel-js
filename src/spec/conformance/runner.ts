import { readFileSync } from 'fs'
import { join } from 'path'
import { parseBasicTextproto, conformanceValueToJS } from './simple-parser'
import { ConformanceTestFile, ConformanceTestCase } from './types'
import { evaluate } from '../../index'
import { unwrapValue } from '../../helper'

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
  loadTestFile(filePath: string): ConformanceTestFile {
    const content = readFileSync(filePath, 'utf-8')
    return parseBasicTextproto(content)
  }

  runTestFile(filePath: string): ConformanceTestResult[] {
    const testFile = this.loadTestFile(filePath)
    const results: ConformanceTestResult[] = []

    for (const section of testFile.section) {
      for (const test of section.test) {
        const result = this.runSingleTest(test, section.name)
        results.push(result)
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
          context[key] = conformanceValueToJS(binding.value)
        }
      }

      // Execute the expression
      const actualResult = evaluate(test.expr, context)

      if (test.eval_error) {
        // Test expects an error, but we got a result
        result.passed = false
        result.error = `Expected error but got result: ${JSON.stringify(actualResult)}`
        result.actual = actualResult
      } else if (test.value) {
        // Test expects a specific value
        const expectedResult = conformanceValueToJS(test.value)
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
