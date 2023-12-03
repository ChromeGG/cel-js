# cel-js

> ⛔ This library is not yet ready for production usage. ⛔

`cel-js` is a powerful and efficient parser and evaluator for Google's [Common Expression Language](https://github.com/google/cel-spec) (CEL), built on the robust foundation of the [Chevrotain](https://chevrotain.io/docs/) parsing library. This library aims to provide a seamless and easy-to-use interface for working with CEL in JavaScript environments.

## Features ✨

- 🚀 Fast and Efficient Parsing: Leverages Chevrotain for high-performance parsing
- 🌍 Isomorphic: Ready for server and browser
- 📦 ESM support
- 📚 Supported CEL Features:
  - [x] Comparison Operators (`==`, `!=`, `<`, `<=`, `>`, `>=`)
  - [ ] Logical Operators (`&&`, `||`, `!`)
  - [ ] Identifiers (Variables, `foo == bar`)
  - [ ] Selectors (`foo.bar[0].baz`)
  - [ ] Macros (`exists`, `has`, `size`, etc.)

## Installation

To install `cel-js`, use npm:

```bash
npm i cel-js
```

## Usage

```ts
import { parse } from 'cel-js'

parse('2 + 2') // => 4

parse('a > 4', { a: 5 }) // => true
```

## Contributing

Here are steps to contribute to this project:

1. Fork this repository.
2. Create a branch: `git checkout -b <branch_name>`.
3. Make your changes
4. Run Verdaccio locally
```zsh
docker run -it --rm --name verdaccio -p 4873:4873 verdaccio/verdaccio
```
5. Create user for local registry: `pnpm adduser --registry http://localhost:4873` (any username and password will work)
6. Publish changes to the local registry using verdaccio: `pnpm run publish:local`
7. Go to `./examples/esm`, run `pnpm i` and test your changes.

I know this is not the best way to test your changes and it could be automated, but I'm still learning how to do it properly. If you have any suggestions, please let me know.
