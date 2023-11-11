import { CelParser } from './src/parser.ts'
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { generateCstDts } from 'chevrotain'
import { fileURLToPath } from 'url'

const parser = new CelParser()

export const productions = parser.getGAstProductions()

const __dirname = dirname(fileURLToPath(import.meta.url))

const dtsString = generateCstDts(productions)
const dtsPath = resolve(__dirname, './src', 'cst-definitions.d.ts')
writeFileSync(dtsPath, dtsString)
