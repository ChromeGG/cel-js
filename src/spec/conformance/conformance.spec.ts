import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { ConformanceTestRunner } from './runner'

describe('CEL Conformance Tests', () => {
  const runner = new ConformanceTestRunner()
  const testDataPath = join(__dirname, '../../../cel-spec/tests/simple/testdata')

  describe('Basic Tests', () => {
    it('should run basic.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'basic.textproto'))
      
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
    it('should run comparisons.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'comparisons.textproto'))
      
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
    it('should run integer_math.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'integer_math.textproto'))
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Integer math tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions  
      // Current: 50/64 = 78.1%
      expect(passRate).toBeGreaterThanOrEqual(78)
    })
  })

  describe('List Tests', () => {
    it('should run lists.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'lists.textproto'))
      
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
    it('should run string.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'string.textproto'))
      
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
    it('should run logic.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'logic.textproto'))
      
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
    it('should run conversions.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'conversions.textproto'))
      
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
    it('should run fp_math.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'fp_math.textproto'))
      
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
    it('should run fields.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'fields.textproto'))
      
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
    it('should run enums.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'enums.textproto'))
      
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
    it('should run timestamps.textproto tests', () => {
      const results = runner.runTestFile(join(testDataPath, 'timestamps.textproto'))
      
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
      const results = runner.runTestFile(join(testDataPath, 'basic.textproto'))
      const test = results.find(r => r.testName === 'self_eval_int_zero')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })

    it('should pass self_eval_bool_true', () => {
      const results = runner.runTestFile(join(testDataPath, 'basic.textproto'))
      const test = results.find(r => r.testName === 'self_eval_bool_true')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })

    it('should pass binop addition', () => {
      const results = runner.runTestFile(join(testDataPath, 'basic.textproto'))
      const test = results.find(r => r.testName === 'binop')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })
  })
})
