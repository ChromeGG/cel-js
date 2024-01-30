// ? run "pnpm tsx demo.ts" in the terminal to see the output

import { evaluate, parse } from 'cel-js'

// Evaluate and log various types of expressions
{
  // Math expression
  const mathExpr = '2 + 2 * 2'
  console.log(`${mathExpr} => ${evaluate(mathExpr)}`) // => 6

  // Float expression
  const floatExpr = '0.1 - 0.2'
  console.log(`${floatExpr} => ${evaluate(floatExpr)}`) // => 0.30000000000000004, same as cel-go, due to floating point precision

  // Parenthesized expression
  const parenthesizedExpr = '(2 + 2) * 2'
  console.log(`${parenthesizedExpr} => ${evaluate(parenthesizedExpr)}`) // => 8

  // Boolean expression
  const booleanExpr = 'true && !false'
  console.log(`${booleanExpr} => ${evaluate(booleanExpr)}`) // => true

  // String concatenation
  const stringExpr = '"foo" + "bar"'
  console.log(`${stringExpr} => ${evaluate(stringExpr)}`) // => 'foobar'

  // Identifier expression with context
  const identifierExpr = 'user.role == "admin"'
  const context = { user: { role: 'admin' } }
  console.log(`${identifierExpr} => ${evaluate(identifierExpr, context)}`) // => true
}

// Parse an expression, useful for validation purposes before persisting
{
  const result = parse('2 + 2')

  if (!result.isSuccess) {
    throw new Error('Invalid syntax')
  }

  // Reuse the result of `parse` to evaluate the expression
  console.log(evaluate(result.cst)) // => 4
}
