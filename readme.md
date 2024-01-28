# cel-js

> ⛔ This library is not yet ready for production usage. ⛔

`cel-js` is a powerful and efficient parser and evaluator for Google's [Common Expression Language](https://github.com/google/cel-spec) (CEL), built on the robust foundation of the [Chevrotain](https://chevrotain.io/docs/) parsing library. This library aims to provide a seamless and easy-to-use interface for working with CEL in JavaScript environments.

## Features ✨

- 🚀 Fast and Efficient Parsing: Leverages Chevrotain for high-performance parsing
- 🌍 Isomorphic: Ready for server and browser
- 📦 ESM support
- 📚 Supported CEL Features:
  - [x] Conditional Operators (`&&`, `||`)
  - [x] Comparison Operators (`==`, `!=`, `<`, `<=`, `>`, `>=`)
  - [x] Unary Operators (`!tue`, `-123`)
  - [x] Arithmetic Operators (`+`, `-`, `*`, `/`, `%`)
  - [x] Identifiers (Variables, `foo == bar`)
  - [x] Selectors (`foo.bar["baz"]`)
  - [ ] Macros (`exists`, `has`, `size`, etc.)

## Installation

To install `cel-js`, use npm:

```bash
npm i cel-js
```

## Usage

```ts
import { parse } from 'cel-js'

parse('2 + 2 * 2') // => 6

parse('a > 1', { a: 2 }) // => true
```
## Known Issues

- Errors types and messages are not 100% consistent with the cel-go implementation