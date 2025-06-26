// ? run "pnpm tsx demo" in the terminal to see the output

import { evaluate, parse } from '../dist/index.js'

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
  const macroExpr = 'size([1, 2])'
  console.log(`${macroExpr} => ${evaluate(macroExpr)}`) // => 2

  // has()
  const hasExpr = 'has(user.role)'
  console.log(`${hasExpr} => ${evaluate(hasExpr, context)}`) // => true

  // Math functions
  console.log(`abs(-5) => ${evaluate('abs(-5)')}`) // => 5
  console.log(`max(3, 7, 2) => ${evaluate('max(3, 7, 2)')}`) // => 7
  console.log(`min(3, 7, 2) => ${evaluate('min(3, 7, 2)')}`) // => 2
  console.log(`floor(3.7) => ${evaluate('floor(3.7)')}`) // => 3
  console.log(`ceil(3.2) => ${evaluate('ceil(3.2)')}`) // => 4

  // String methods
  console.log(`"hello world".contains("world") => ${evaluate('"hello world".contains("world")')}`) // => true
  console.log(`"filename.txt".endsWith(".txt") => ${evaluate('"filename.txt".endsWith(".txt")')}`) // => true
  console.log(`"  hello  ".trim() => "${evaluate('"  hello  ".trim()')}"`) // => "hello"
  console.log(`"a,b,c".split(",") => ${JSON.stringify(evaluate('"a,b,c".split(",")'))}`); // => ["a","b","c"]

  // String method chaining
  console.log(`"  hello,world  ".trim().split(",") => ${JSON.stringify(evaluate('"  hello,world  ".trim().split(",")'))}`); // => ["hello","world"]

  // Timestamp and duration
  console.log(`timestamp("2023-01-01T00:00:00Z") => ${evaluate('timestamp("2023-01-01T00:00:00Z")').toISOString()}`) // => 2023-01-01T00:00:00.000Z
  console.log(`duration("1h30m") => ${JSON.stringify(evaluate('duration("1h30m")'))}`); // => {"seconds":5400,"nanoseconds":0}
  console.log(`timestamp("2023-01-01T00:00:00Z") + duration("1h") => ${evaluate('timestamp("2023-01-01T00:00:00Z") + duration("1h")').toISOString()}`) // => 2023-01-01T01:00:00.000Z

  // List operations
  // filter
  console.log(`[1, 2, 3, 4, 5].filter(v, v > 3) => ${JSON.stringify(evaluate('[1, 2, 3, 4, 5].filter(v, v > 3)'))}`); // => [4,5]
  
  // map (transform)
  console.log(`[1, 2, 3].map(v, v * 2) => ${JSON.stringify(evaluate('[1, 2, 3].map(v, v * 2)'))}`); // => [2,4,6]
  
  // map (filter and transform)
  console.log(`[1, 2, 3, 4, 5].map(v, v > 3, v * 2) => ${JSON.stringify(evaluate('[1, 2, 3, 4, 5].map(v, v > 3, v * 2)'))}`); // => [8,10]

  // List macros
  console.log(`[1, 2, 3].all(v, v > 0) => ${evaluate('[1, 2, 3].all(v, v > 0)')}`); // => true
  console.log(`[1, 2, 3].exists(v, v > 2) => ${evaluate('[1, 2, 3].exists(v, v > 2)')}`); // => true
  console.log(`[1, 2, 3].exists_one(v, v > 2) => ${evaluate('[1, 2, 3].exists_one(v, v > 2)')}`); // => true

  // Map operations
  console.log(`{"a": 1, "b": 2, "c": 3}.filter(v, v > 1) => ${JSON.stringify(evaluate('{"a": 1, "b": 2, "c": 3}.filter(v, v > 1)'))}`); // => {"b":2,"c":3}
  console.log(`{"a": 1, "b": 2}.map(v, v * 10) => ${JSON.stringify(evaluate('{"a": 1, "b": 2}.map(v, v * 10)'))}`); // => {"a":10,"b":20}

  // Complex chained expressions
  const chainedExpr = '["  hello  ", "  world  "].map(s, s.trim()).filter(s, s.contains("o"))'
  console.log(`${chainedExpr} => ${JSON.stringify(evaluate(chainedExpr))}`); // => ["hello","world"]

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
