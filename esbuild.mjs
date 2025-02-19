import * as esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.mjs',
  format: 'esm',
  minify: true,
})

// TODO can we do it with esbuild/tsconfig.json?
// remove all files with .d.ts extension from dist folder except index.d.ts
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const distDir = path.join(__dirname, 'dist')
const files = fs.readdirSync(distDir)

files.forEach((file) => {
  if (file.endsWith('.d.ts') && file !== 'index.d.ts') {
    fs.unlinkSync(path.join(distDir, file))
  }
})
