# cel-js

> [!NOTE]  
> There is also [a great implementation of cel-js](https://github.com/marcbachmann) made by @marcbachmann. It has full syntax support and better performance. You may consider it too 🙂

`cel-js` is a powerful and efficient parser and evaluator for Google's [Common Expression Language](https://github.com/google/cel-spec) (CEL), built on the robust foundation of the [Chevrotain](https://chevrotain.io/docs/) parsing library. This library aims to provide a seamless and easy-to-use interface for working with CEL in JavaScript environments.

## Live Demo 🚀

Try out `cel-js` in your browser with the [live demo](https://stackblitz.com/github/ChromeGG/cel-js/tree/main/demo?file=demo.ts).

## Features ✨

- 🚀 Fast and Efficient Parsing: Leverages Chevrotain for high-performance parsing and evaluation
- 🌍 Isomorphic: Ready for server and browser
- 📦 ESM support
- 📚 Supported CEL Features:
  - [x] Literals
    - [x] int
    - [x] uint
    - [x] double
    - [x] bool
    - [x] string
      - [x] single-quote string
      - [x] double-quote string
      - [ ] raw string
      - [ ] triple-quote string
      - [ ] byte string
    - [x] hexadecimal
    - [ ] bytes
    - [x] list
    - [x] map
    - [x] null
  - [x] Conditional Operators
    - [x] Ternary (`condition ? true : false`)
    - [x] Logical And (`&&`)
    - [x] Logical Or (`||`)
  - [x] Equality Operators (`==`, `!=`)
  - [x] Relational Operators (`<`, `<=`, `>`, `>=`, `in`)
  - [x] Arithmetic Operators (`+`, `-`, `*`, `/`, `%`)
  - [x] Identifiers
    - [x] Dot Notation (`foo.bar`)
    - [x] Index Notation (`foo["bar"]`)
  - [x] [Macros](https://github.com/google/cel-spec/blob/master/doc/langdef.md#macros): (`has`, `size`, etc.)
    - [x] All (`e.all(x, p)`)
    - [x] Exists (`e.exists(x, p)`)
    - [x] Exists one (`e.exists_one(x, p)`)
    - [x] Filter (`e.filter(x, p)`)
    - [x] Has (`has(foo.bar)`)
    - [x] Map (`e.map(x, t)` and `e.map(x, p, t)`)
    - [x] Size (`size(foo)`)
  - [x] Unary Operators (`!true`, `-123`)
  - [x] Custom Functions (`myFunction()`)
  - [x] Comments (`// This is a comment`)

## Installation

To install `cel-js`, use npm:

```bash
npm i cel-js
```

## Usage

### `evaluate`

`evaluate` is the primary function for parsing and evaluating CEL expressions. It takes an expression string and an optional object of variables to use in the expression.

```ts
import { evaluate, parse } from 'cel-js'

// use `evaluate` to parse and evaluate an expression
evaluate('2 + 2 * 2') // => 6

evaluate('"foo" + "bar"') // => 'foobar'

evaluate('user.role == "admin"', { user: { role: 'admin' } }) // => true
```

### `parse`

`parse` is a lower-level function that only parses an expression string into an AST. This can be useful if you want to evaluate the expression multiple times with different variables or if you want to validate the syntax of an expression.

```ts
// use `parse` to parse an expression, useful for validation purposes
const result = parse('2 + a')

if (!result.isSuccess) {
  // your business logic
}

// you can reuse the result of `parse` to evaluate the expression
evaluate(result.cst, { a: 2 }) // => 4
evaluate(result.cst, { a: 4 }) // => 6
```

## Known Issues

- Errors types and messages are not 100% consistent with the cel-go implementation,
