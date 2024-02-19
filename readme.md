# cel-js

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
    - [ ] bytes
    - [x] list
    - [ ] map
    - [x] null 
  - [x] Conditional Operators
    - [ ] Ternary (`condition ? true : false`)
    - [x] Logical And (`&&`)
    - [x] Logical Or (`||`)
  - [x] Equality Operators (`==`, `!=`)
  - [x] Relational Operators (`<`, `<=`, `>`, `>=`)
  - [x] Arithmetic Operators (`+`, `-`, `*`, `/`, `%`)
  - [x] Identifiers
    - [x] Dot Notation (`foo.bar`)
    - [x] Index Notation (`foo["bar"]`)
  - [ ] Macros (`exists`, `has`, `size`, etc.)
  - [x] Unary Operators (`!true`, `-123`)

## Installation

To install `cel-js`, use npm:

```bash
npm i cel-js
```

## Usage

```ts
import { evaluate, parse } from 'cel-js'

// use `evaluate` to parse and evaluate an expression
evaluate('2 + 2 * 2') // => 6

evaluate('"foo" + "bar"') // => 'foobar'

evaluate('user.role == "admin"', { user: { role: 'admin' } }) // => true

// use `parse` to parse an expression, useful for validation purposes
const result = parse('2 + 2')

if (!result.isSuccess) {
  throw new Error('Invalid syntax')
}

// you can reuse the result of `parse` to evaluate the expression
evaluate(result.cst) // => 4
```

## Known Issues

- Errors types and messages are not 100% consistent with the cel-go implementation

```

```
