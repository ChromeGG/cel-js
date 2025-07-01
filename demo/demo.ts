// ? run "pnpm tsx demo" in the terminal to see the output

import { evaluate, parse } from 'cel-js'

// Evaluate and log various types of expressions
{
  // Math expression
  const mathExpr = '2 + 2 * 2'
  console.log(`${mathExpr} => ${evaluate(mathExpr)}`) // => 6

  // Float expression
  const floatExpr = '0.1 + 0.2'
  console.log(`${floatExpr} => ${evaluate(floatExpr)}`) // => 0.30000000000000004, same as cel-go, due to floating point precision

  // Parenthesized expression
  const parenthesizedExpr = '(2 + 2) * 2'
  console.log(`${parenthesizedExpr} => ${evaluate(parenthesizedExpr)}`) // => 8

  // Boolean expression
  const booleanExpr = 'true && !false'
  console.log(`${booleanExpr} => ${evaluate(booleanExpr)}`) // => true

  // String concatenation
  const stringExpr = `"foo" + 'bar'`
  console.log(`${stringExpr} => ${evaluate(stringExpr)}`) // => 'foobar'

  // Identifier expression with context
  const identifierExpr = 'user.role == "admin"'
  const context = { user: { role: 'admin' } }
  console.log(`${identifierExpr} => ${evaluate(identifierExpr, context)}`) // => true

  // Ternary operator
  const ternaryExpr = 'user.role == "admin" ? "owner" : "user"'
  console.log(`${ternaryExpr} => ${evaluate(ternaryExpr, context)}`) // => 'owner'

  // Array expressions
  const arrayExpr = '[1, 2]'
  console.log(`${arrayExpr} => ${evaluate(arrayExpr)}`) // => [1, 2]

  // Map expressions
  const mapExpr = '{"a": 1, "b": 2}'
  console.log(`${mapExpr} => ${JSON.stringify(evaluate(mapExpr))}`) // => { a: 1, b: 2 }

  // Macro expressions
  // size()
  const sizeMacroExpr = 'size([1, 2])'
  console.log(`${sizeMacroExpr} => ${evaluate(sizeMacroExpr)}`) // => 2

  // has()
  const hasMacroExpr = 'has(user.role)'
  console.log(`${hasMacroExpr} => ${evaluate(hasMacroExpr, context)}`) // => true

  // filter()
  const filterMacroExpr = 'filter([1, 2, 3, 4, 5], n, n > 3)'
  console.log(`${filterMacroExpr} => ${evaluate(filterMacroExpr)}`) // => [4, 5]

  // map()
  const mapMacroExpr = 'map([1, 2, 3, 4, 5], n, n * 2)'
  console.log(`${mapMacroExpr} => ${evaluate(mapMacroExpr)}`) // => [2, 4, 6, 8, 10]

  // all()
  const allMacroExpr = 'all([1, 2, 3, 4, 5], n, n > 0)'
  console.log(`${allMacroExpr} => ${evaluate(allMacroExpr)}`) // => true

  // exists()
  const existsMacroExpr = 'exists([1, 2, 3, 4, 5], n, n > 5)'
  console.log(`${existsMacroExpr} => ${evaluate(existsMacroExpr)}`) // => false

  // exists_one()
  const existsOneMacroExpr = 'exists_one([1, 2, 3, 4, 5], n, n > 3)'
  console.log(`${existsOneMacroExpr} => ${evaluate(existsOneMacroExpr)}`) // => true

  // Custom function expressions
  const functionExpr = 'max(2, 1, 3, 7)'
  console.log(
    `${functionExpr} => ${evaluate(functionExpr, {}, { max: Math.max })}`,
  ) // => 7

  // Comment support
  const commentedExpr = `// multi-line comment
    "foo" + // some comment
    "bar"
  `
  console.log(`${commentedExpr} => ${evaluate(commentedExpr)}`) // => 'foobar'
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
