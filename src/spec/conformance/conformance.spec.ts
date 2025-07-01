import { describe, it, expect } from 'vitest'
import { ConformanceTestRunner } from './runner'

describe('CEL Conformance Tests', () => {
  const runner = new ConformanceTestRunner()

  describe('Basic Tests', () => {
    it('should run basic tests', () => {
      const results = runner.runTestFile('basic')
      
      // Log results for debugging
      const report = runner.generateReport(results)
      console.log(report)
      
      // Count passed/failed
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Basic tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      // Current: ~42% (basic language features)
      expect(passRate).toBeGreaterThanOrEqual(40)
      
      // Test that regression detection works (temporarily set to impossible value)
      // expect(passRate).toBeGreaterThanOrEqual(99) // Uncomment to test failure
    })
  })

  describe('Comparison Tests', () => {
    it('should run comparisons tests', () => {
      const results = runner.runTestFile('comparisons')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Comparison tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      // Current: 132/406 = 32.5%
      expect(passRate).toBeGreaterThanOrEqual(32)
    })
  })

  describe('Integer Math Tests', () => {
    it('should run integer_math tests', () => {
      const results = runner.runTestFile('integer_math')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Integer math tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions  
      // Current: 45/64 = 70.3% (updated with buf loader)
      expect(passRate).toBeGreaterThanOrEqual(70)
    })
  })

  describe('List Tests', () => {
    it('should run lists tests', () => {
      const results = runner.runTestFile('lists')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`List tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      // Current: 16/39 = 41.0%
      expect(passRate).toBeGreaterThanOrEqual(41)
    })
  })

  describe('String Tests', () => {
    it('should run string tests', () => {
      const results = runner.runTestFile('string')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`String tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      expect(passRate).toBeGreaterThanOrEqual(1) // Set baseline after first run
    })
  })

  describe('Logic Tests', () => {
    it('should run logic tests', () => {
      const results = runner.runTestFile('logic')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Logic tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      expect(passRate).toBeGreaterThanOrEqual(1) // Set baseline after first run
    })
  })

  describe('Conversion Tests', () => {
    it('should run conversions tests', () => {
      const results = runner.runTestFile('conversions')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Conversion tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      expect(passRate).toBeGreaterThanOrEqual(1) // Set baseline after first run
    })
  })

  describe('Floating Point Math Tests', () => {
    it('should run fp_math tests', () => {
      const results = runner.runTestFile('fp_math')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Floating point math tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      expect(passRate).toBeGreaterThanOrEqual(1) // Set baseline after first run
    })
  })

  describe('Field Access Tests', () => {
    it('should run fields tests', () => {
      const results = runner.runTestFile('fields')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Field access tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      expect(passRate).toBeGreaterThanOrEqual(1) // Set baseline after first run
    })
  })

  describe('Enum Tests', () => {
    it('should run enums tests', () => {
      const results = runner.runTestFile('enums')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Enum tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      expect(passRate).toBeGreaterThanOrEqual(1) // Set baseline after first run
    })
  })

  describe('Timestamp Tests', () => {
    it('should run timestamps tests', () => {
      const results = runner.runTestFile('timestamps')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Timestamp tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions
      expect(passRate).toBeGreaterThanOrEqual(1) // Set baseline after first run
    })
  })

  describe('Individual Test Cases', () => {
    it('should pass self_eval_int_zero', () => {
      const results = runner.runTestFile('basic')
      const test = results.find(r => r.testName === 'self_eval_int_zero')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })

    it('should pass self_eval_bool_true', () => {
      const results = runner.runTestFile('basic')
      const test = results.find(r => r.testName === 'self_eval_bool_true')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })

    it('should pass binop addition', () => {
      const results = runner.runTestFile('basic')
      const test = results.find(r => r.testName === 'binop')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })
  })
})
