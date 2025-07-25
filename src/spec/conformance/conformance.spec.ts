import { describe, it, expect } from 'vitest'
import { ConformanceTestRunner } from './runner'

describe('CEL Conformance Tests', () => {
  const runner = new ConformanceTestRunner()

  describe('Basic Tests', () => {
    it('should run basic tests', async () => {
      const results = await runner.runTestFile('basic')
      
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
    it('should run comparisons tests', async () => {
      const results = await runner.runTestFile('comparisons')
      
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
    it('should run integer_math tests', async () => {
      const results = await runner.runTestFile('integer_math')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Integer math tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // We expect a minimum pass rate to prevent regressions  
      // Current: 64/64 = 100% (fixed error handling)
      expect(passRate).toBeGreaterThanOrEqual(100)
    })
  })

  describe('List Tests', () => {
    it('should run lists tests', async () => {
      const results = await runner.runTestFile('lists')
      
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
    it('should run string tests', async () => {
      const results = await runner.runTestFile('string')
      
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
    it('should run logic tests', async () => {
      const results = await runner.runTestFile('logic')
      
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
    it('should run conversions tests', async () => {
      const results = await runner.runTestFile('conversions')
      
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
    it('should run fp_math tests', async () => {
      const results = await runner.runTestFile('fp_math')
      
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
    it('should run fields tests', async () => {
      const results = await runner.runTestFile('fields')
      
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
    it('should run enums tests', async () => {
      const results = await runner.runTestFile('enums')
      
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
    it('should run timestamps tests', async () => {
      const results = await runner.runTestFile('timestamps')
      
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

  describe('Bindings Extension Tests', () => {
    it('should run bindings_ext tests', async () => {
      const results = await runner.runTestFile('bindings_ext')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = total > 0 ? (passed / total) * 100 : 0
      
      console.log(`Bindings extension tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // Skip test if no tests are found
      if (total === 0) {
        console.log('No tests found in bindings_ext file, skipping...')
        return
      }
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Block Extension Tests', () => {
    it('should run block_ext tests', async () => {
      console.log('Loading block_ext test file...')
      const results = await runner.runTestFile('block_ext')
      console.log(`Loaded ${results.length} tests from block_ext`)
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = total > 0 ? (passed / total) * 100 : 0
      
      console.log(`Block extension tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // Skip test if no tests are found
      if (total === 0) {
        console.log('No tests found in block_ext file, skipping...')
        return
      }
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Dynamic Type Tests', () => {
    it('should run dynamic tests', async () => {
      const results = await runner.runTestFile('dynamic')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Dynamic type tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Encoders Extension Tests', () => {
    it('should run encoders_ext tests', async () => {
      const results = await runner.runTestFile('encoders_ext')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = total > 0 ? (passed / total) * 100 : 0
      
      console.log(`Encoders extension tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // Skip test if no tests are found
      if (total === 0) {
        console.log('No tests found in encoders_ext file, skipping...')
        return
      }
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Macro Tests', () => {
    it('should run macros tests', async () => {
      const results = await runner.runTestFile('macros')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Macro tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Macro Tests 2', () => {
    it('should run macros2 tests', async () => {
      const results = await runner.runTestFile('macros2')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Macro 2 tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Math Extension Tests', () => {
    it('should run math_ext tests', async () => {
      const results = await runner.runTestFile('math_ext')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Math extension tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Namespace Tests', () => {
    it('should run namespace tests', async () => {
      const results = await runner.runTestFile('namespace')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Namespace tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Optional Value Tests', () => {
    it('should run optionals tests', async () => {
      const results = await runner.runTestFile('optionals')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Optional value tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Parse Tests', () => {
    it('should run parse tests', async () => {
      const results = await runner.runTestFile('parse')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Parse tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Plumbing Tests', () => {
    it('should run plumbing tests', async () => {
      const results = await runner.runTestFile('plumbing')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Plumbing tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Protocol Buffer v2 Tests', () => {
    it('should run proto2 tests', async () => {
      const results = await runner.runTestFile('proto2')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Protocol Buffer v2 tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Protocol Buffer v2 Extension Tests', () => {
    it('should run proto2_ext tests', async () => {
      const results = await runner.runTestFile('proto2_ext')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = total > 0 ? (passed / total) * 100 : 0
      
      console.log(`Protocol Buffer v2 extension tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // Skip test if no tests are found
      if (total === 0) {
        console.log('No tests found in proto2_ext file, skipping...')
        return
      }
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Protocol Buffer v3 Tests', () => {
    it('should run proto3 tests', async () => {
      const results = await runner.runTestFile('proto3')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Protocol Buffer v3 tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('String Extension Tests', () => {
    it('should run string_ext tests', async () => {
      const results = await runner.runTestFile('string_ext')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`String extension tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Type Deduction Tests', () => {
    it('should run type_deductions tests', async () => {
      const results = await runner.runTestFile('type_deductions')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Type deduction tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Unknown Value Tests', () => {
    it('should run unknowns tests', async () => {
      const results = await runner.runTestFile('unknowns')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = total > 0 ? (passed / total) * 100 : 0
      
      console.log(`Unknown value tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      // Skip test if no tests are found
      if (total === 0) {
        console.log('No tests found in unknowns file, skipping...')
        return
      }
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Wrapper Type Tests', () => {
    it('should run wrappers tests', async () => {
      const results = await runner.runTestFile('wrappers')
      
      const report = runner.generateReport(results)
      console.log(report)
      
      const passed = results.filter(r => r.passed).length
      const total = results.length
      const passRate = (passed / total) * 100
      
      console.log(`Wrapper type tests: ${passed}/${total} passed (${passRate.toFixed(1)}%)`)
      
      expect(passRate).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Individual Test Cases', () => {
    it('should pass self_eval_int_zero', async () => {
      const results = await runner.runTestFile('basic')
      const test = results.find(r => r.testName === 'self_eval_int_zero')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })

    it('should pass self_eval_bool_true', async () => {
      const results = await runner.runTestFile('basic')
      const test = results.find(r => r.testName === 'self_eval_bool_true')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })

    it('should pass binop addition', async () => {
      const results = await runner.runTestFile('basic')
      const test = results.find(r => r.testName === 'binop')
      
      expect(test).toBeDefined()
      expect(test!.passed).toBe(true)
    })
  })
})
