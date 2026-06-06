/**
 * Build script: regenerates test/fixtures/crypto-golden.json from current crypto code.
 * Run once on Node 16 with secp256k1@3 to freeze the v0.11.3 behavior, then commit
 * the JSON. After Phase 4 (@noble swap), the same script (or test/crypto-golden.ts)
 * must produce identical output.
 *
 * Usage (inside Node 16 Docker, with deps installed):
 *   npx ts-node test/fixtures/build-golden.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import {generateFixtures} from './generator'

const out = path.join(__dirname, 'crypto-golden.json')
const fixtures = generateFixtures()
fs.writeFileSync(out, JSON.stringify(fixtures, null, 2) + '\n')
console.log(`Wrote ${fixtures.hashes.length} hash + ${fixtures.signatures.length} sign + ${fixtures.transactions.length} tx vectors to ${out}`)
