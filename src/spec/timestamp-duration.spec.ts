import { describe, expect, it } from 'vitest'
import { evaluate } from '../index.js'

describe('Timestamp and Duration Support', () => {
  describe('Timestamp Literals', () => {
    it('should parse RFC3339 timestamp literals', () => {
      expect(evaluate('timestamp("2023-01-01T00:00:00Z")')).toEqual(new Date('2023-01-01T00:00:00Z'))
    })

    it('should parse timestamp with timezone offset', () => {
      expect(evaluate('timestamp("2023-12-25T15:30:45-08:00")')).toEqual(new Date('2023-12-25T15:30:45-08:00'))
    })

    it('should parse timestamp with fractional seconds', () => {
      expect(evaluate('timestamp("2023-06-15T12:30:45.123Z")')).toEqual(new Date('2023-06-15T12:30:45.123Z'))
    })

    it('should handle timestamp without timezone (assumes UTC)', () => {
      expect(evaluate('timestamp("2023-01-01T00:00:00")')).toEqual(new Date('2023-01-01T00:00:00Z'))
    })

    it('should throw error for invalid timestamp format', () => {
      expect(() => evaluate('timestamp("invalid-date")')).toThrow()
    })

    it('should throw error for non-string timestamp argument', () => {
      expect(() => evaluate('timestamp(123)')).toThrow()
    })
  })

  describe('Duration Literals', () => {
    it('should parse duration with seconds', () => {
      const result = evaluate('duration("30s")')
      expect(result).toEqual({ seconds: 30, nanoseconds: 0 })
    })

    it('should parse duration with minutes', () => {
      const result = evaluate('duration("5m")')
      expect(result).toEqual({ seconds: 300, nanoseconds: 0 })
    })

    it('should parse duration with hours', () => {
      const result = evaluate('duration("2h")')
      expect(result).toEqual({ seconds: 7200, nanoseconds: 0 })
    })

    it('should parse complex duration', () => {
      const result = evaluate('duration("1h30m45s")')
      expect(result).toEqual({ seconds: 5445, nanoseconds: 0 })
    })

    it('should parse duration with fractional seconds', () => {
      const result = evaluate('duration("1.5s")')
      expect(result).toEqual({ seconds: 1, nanoseconds: 500000000 })
    })

    it('should parse duration with milliseconds', () => {
      const result = evaluate('duration("123ms")')
      expect(result).toEqual({ seconds: 0, nanoseconds: 123000000 })
    })

    it('should parse duration with microseconds', () => {
      const result = evaluate('duration("456us")')
      expect(result).toEqual({ seconds: 0, nanoseconds: 456000 })
    })

    it('should parse duration with nanoseconds', () => {
      const result = evaluate('duration("789ns")')
      expect(result).toEqual({ seconds: 0, nanoseconds: 789 })
    })

    it('should parse negative duration', () => {
      const result = evaluate('duration("-1h")')
      expect(result).toEqual({ seconds: -3600, nanoseconds: 0 })
    })

    it('should throw error for invalid duration format', () => {
      expect(() => evaluate('duration("invalid")')).toThrow()
    })

    it('should throw error for non-string duration argument', () => {
      expect(() => evaluate('duration(123)')).toThrow()
    })
  })

  describe('Timestamp Arithmetic', () => {
    it('should add duration to timestamp', () => {
      const expr = 'timestamp("2023-01-01T00:00:00Z") + duration("1h")'
      expect(evaluate(expr)).toEqual(new Date('2023-01-01T01:00:00Z'))
    })

    it('should subtract duration from timestamp', () => {
      const expr = 'timestamp("2023-01-01T01:00:00Z") - duration("30m")'
      expect(evaluate(expr)).toEqual(new Date('2023-01-01T00:30:00Z'))
    })

    it('should subtract timestamps to get duration', () => {
      const expr = 'timestamp("2023-01-01T01:00:00Z") - timestamp("2023-01-01T00:00:00Z")'
      const result = evaluate(expr)
      expect(result).toEqual({ seconds: 3600, nanoseconds: 0 })
    })

    it('should handle complex timestamp arithmetic', () => {
      const expr = 'timestamp("2023-01-01T00:00:00Z") + duration("1h30m") - duration("15m")'
      expect(evaluate(expr)).toEqual(new Date('2023-01-01T01:15:00Z'))
    })
  })

  describe('Duration Arithmetic', () => {
    it('should add durations', () => {
      const expr = 'duration("1h") + duration("30m")'
      const result = evaluate(expr)
      expect(result).toEqual({ seconds: 5400, nanoseconds: 0 })
    })

    it('should subtract durations', () => {
      const expr = 'duration("2h") - duration("30m")'
      const result = evaluate(expr)
      expect(result).toEqual({ seconds: 5400, nanoseconds: 0 })
    })

    it('should multiply duration by scalar', () => {
      const expr = 'duration("30m") * 2'
      const result = evaluate(expr)
      expect(result).toEqual({ seconds: 3600, nanoseconds: 0 })
    })

    it('should divide duration by scalar', () => {
      const expr = 'duration("1h") / 2'
      const result = evaluate(expr)
      expect(result).toEqual({ seconds: 1800, nanoseconds: 0 })
    })

    it('should handle negative duration arithmetic', () => {
      const expr = 'duration("1h") + duration("-30m")'
      const result = evaluate(expr)
      expect(result).toEqual({ seconds: 1800, nanoseconds: 0 })
    })
  })

  describe('Timestamp Comparisons', () => {
    it('should compare timestamps for equality', () => {
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") == timestamp("2023-01-01T00:00:00Z")')).toBe(true)
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") == timestamp("2023-01-02T00:00:00Z")')).toBe(false)
    })

    it('should compare timestamps for inequality', () => {
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") != timestamp("2023-01-02T00:00:00Z")')).toBe(true)
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") != timestamp("2023-01-01T00:00:00Z")')).toBe(false)
    })

    it('should compare timestamps with less than', () => {
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") < timestamp("2023-01-02T00:00:00Z")')).toBe(true)
      expect(evaluate('timestamp("2023-01-02T00:00:00Z") < timestamp("2023-01-01T00:00:00Z")')).toBe(false)
    })

    it('should compare timestamps with greater than', () => {
      expect(evaluate('timestamp("2023-01-02T00:00:00Z") > timestamp("2023-01-01T00:00:00Z")')).toBe(true)
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") > timestamp("2023-01-02T00:00:00Z")')).toBe(false)
    })

    it('should compare timestamps with less than or equal', () => {
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") <= timestamp("2023-01-01T00:00:00Z")')).toBe(true)
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") <= timestamp("2023-01-02T00:00:00Z")')).toBe(true)
      expect(evaluate('timestamp("2023-01-02T00:00:00Z") <= timestamp("2023-01-01T00:00:00Z")')).toBe(false)
    })

    it('should compare timestamps with greater than or equal', () => {
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") >= timestamp("2023-01-01T00:00:00Z")')).toBe(true)
      expect(evaluate('timestamp("2023-01-02T00:00:00Z") >= timestamp("2023-01-01T00:00:00Z")')).toBe(true)
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") >= timestamp("2023-01-02T00:00:00Z")')).toBe(false)
    })
  })

  describe('Duration Comparisons', () => {
    it('should compare durations for equality', () => {
      expect(evaluate('duration("1h") == duration("60m")')).toBe(true)
      expect(evaluate('duration("1h") == duration("30m")')).toBe(false)
    })

    it('should compare durations for inequality', () => {
      expect(evaluate('duration("1h") != duration("30m")')).toBe(true)
      expect(evaluate('duration("1h") != duration("60m")')).toBe(false)
    })

    it('should compare durations with less than', () => {
      expect(evaluate('duration("30m") < duration("1h")')).toBe(true)
      expect(evaluate('duration("1h") < duration("30m")')).toBe(false)
    })

    it('should compare durations with greater than', () => {
      expect(evaluate('duration("1h") > duration("30m")')).toBe(true)
      expect(evaluate('duration("30m") > duration("1h")')).toBe(false)
    })
  })

  describe('Timestamp Methods', () => {
    it('should work with timestamps from context', () => {
      const context = { ts: new Date('2023-12-25T15:30:45Z') }
      expect(evaluate('ts.getFullYear()', context)).toBe(2023)
      expect(evaluate('ts.getMonth()', context)).toBe(11)
      expect(evaluate('ts.getDate()', context)).toBe(25)
      expect(evaluate('ts.getHours()', context)).toBe(15)
      expect(evaluate('ts.getMinutes()', context)).toBe(30)
      expect(evaluate('ts.getSeconds()', context)).toBe(45)
      expect(evaluate('ts.getDay()', context)).toBe(1) // Monday
    })

    it('should get Unix time from context timestamp', () => {
      const context = { ts: new Date('2023-01-01T00:00:00Z') }
      expect(evaluate('ts.getTime()', context)).toBe(1672531200000)
    })

    it('should get timestamp year from function result', () => {
      expect(evaluate('timestamp("2023-12-25T15:30:45Z").getFullYear()')).toBe(2023)
    })

    it('should get timestamp month from function result', () => {
      expect(evaluate('timestamp("2023-12-25T15:30:45Z").getMonth()')).toBe(11)
    })

    it('should get timestamp date from function result', () => {
      expect(evaluate('timestamp("2023-12-25T15:30:45Z").getDate()')).toBe(25)
    })

    it('should get timestamp hours from function result', () => {
      expect(evaluate('timestamp("2023-12-25T15:30:45Z").getHours()')).toBe(15)
    })

    it('should get timestamp minutes from function result', () => {
      expect(evaluate('timestamp("2023-12-25T15:30:45Z").getMinutes()')).toBe(30)
    })

    it('should get timestamp seconds from function result', () => {
      expect(evaluate('timestamp("2023-12-25T15:30:45Z").getSeconds()')).toBe(45)
    })

    it('should get timestamp day of week from function result', () => {
      expect(evaluate('timestamp("2023-12-25T15:30:45Z").getDay()')).toBe(1) // Monday
    })

    it('should get timestamp as Unix time from function result', () => {
      expect(evaluate('timestamp("2023-01-01T00:00:00Z").getTime()')).toBe(1672531200000)
    })
  })

  describe('Duration Methods', () => {
    it('should work with durations from context', () => {
      const context = { 
        dur1: { seconds: 5400, nanoseconds: 0 },
        dur2: { seconds: 1, nanoseconds: 500000000 }
      }
      expect(evaluate('dur1.getSeconds()', context)).toBe(5400)
      expect(evaluate('dur2.getMilliseconds()', context)).toBe(1500)
      expect(evaluate('dur1.getNanoseconds()', context)).toBe(5400000000000)
    })

    it('should get duration in seconds from function result', () => {
      expect(evaluate('duration("1h30m").getSeconds()')).toBe(5400)
    })

    it('should get duration in milliseconds from function result', () => {
      expect(evaluate('duration("1.5s").getMilliseconds()')).toBe(1500)
    })

    it('should get duration in nanoseconds from function result', () => {
      expect(evaluate('duration("1s").getNanoseconds()')).toBe(1000000000)
    })
  })

  describe('Context Integration', () => {
    it('should work with timestamps in context', () => {
      const context = {
        startTime: new Date('2023-01-01T00:00:00Z'),
        endTime: new Date('2023-01-01T02:00:00Z')
      }
      expect(evaluate('endTime - startTime', context)).toEqual({ seconds: 7200, nanoseconds: 0 })
    })

    it('should work with durations in context', () => {
      const context = {
        timeout: { seconds: 300, nanoseconds: 0 }
      }
      expect(evaluate('timestamp("2023-01-01T00:00:00Z") + timeout', context))
        .toEqual(new Date('2023-01-01T00:05:00Z'))
    })
  })

  describe('Complex Expressions', () => {
    it('should handle complex timestamp expressions', () => {
      const expr = 'timestamp("2023-01-01T00:00:00Z") + duration("1h") > timestamp("2023-01-01T00:30:00Z")'
      expect(evaluate(expr)).toBe(true)
    })

    it('should handle timestamp in conditional expressions', () => {
      const expr = 'timestamp("2023-01-01T00:00:00Z") < timestamp("2023-01-02T00:00:00Z") ? "past" : "future"'
      expect(evaluate(expr)).toBe('past')
    })

    it('should handle duration calculations', () => {
      const expr = '(duration("2h") + duration("30m")) / 3'
      const result = evaluate(expr)
      expect(result).toEqual({ seconds: 3000, nanoseconds: 0 })
    })

    it('should work with collection operations', () => {
      const context = {
        events: [
          { time: new Date('2023-01-01T10:00:00Z'), type: 'start' },
          { time: new Date('2023-01-01T11:30:00Z'), type: 'middle' },
          { time: new Date('2023-01-01T13:00:00Z'), type: 'end' }
        ]
      }
      const expr = 'events.filter(e, e.time > timestamp("2023-01-01T10:30:00Z")).size()'
      expect(evaluate(expr, context)).toBe(2)
    })
  })

  describe('Error Cases', () => {
    it('should throw for invalid timestamp operations', () => {
      expect(() => evaluate('timestamp("2023-01-01T00:00:00Z") + 5')).toThrow()
    })

    it('should throw for invalid duration operations', () => {
      expect(() => evaluate('duration("1h") + "string"')).toThrow()
    })

    it('should throw for timestamp division', () => {
      expect(() => evaluate('timestamp("2023-01-01T00:00:00Z") / 2')).toThrow()
    })

    it('should throw for duration with timestamp addition order', () => {
      expect(() => evaluate('5 + timestamp("2023-01-01T00:00:00Z")')).toThrow()
    })
  })
})
