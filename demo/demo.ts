import { evaluate, parse } from 'cel-js'

// use `evaluate` to parse and evaluate an expression
console.log(evaluate('2 + 2 * 2')) // => 6

console.log(evaluate('"foo" + "bar"')) // => 'foobar'

console.log(evaluate('user.role == "admin"', { user: { role: 'admin' } })) // => true

// --------------------------------------------

// use `parse` to parse an expression, useful for validation purposes
const result = parse('2 + 2')

if (!result.isSuccess) {
  throw new Error('Invalid syntax')
}

// you can reuse the result of `parse` to evaluate the expression
console.log(evaluate(result.cst)) // => 4
