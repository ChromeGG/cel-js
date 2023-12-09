import { expect, describe, it } from 'vitest'

import { parse } from '..'
import { reservedIdentifiers } from '../tokens.js'

describe('reserved identifiers', () => {
  it.each(reservedIdentifiers)(
    'should throw if reserved identifier "%s" is used',
    (identifier) => {
      const expr = `${identifier} < 1`

      const result = () => parse(expr)

      expect(result).toThrow(
        `Detected reserved identifier. This is not allowed`
      )
    }
  )
})
