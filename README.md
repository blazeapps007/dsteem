# dsteem

[![CI](https://github.com/jnordberg/dsteem/actions/workflows/ci.yml/badge.svg)](https://github.com/jnordberg/dsteem/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/dsteem.svg)](https://www.npmjs.com/package/dsteem)

Robust [Steem blockchain](https://steem.io) RPC client for Node.js and browsers.

- Pure-JS cryptography ([`@noble/curves`](https://github.com/paulmillr/noble-curves), [`@noble/hashes`](https://github.com/paulmillr/noble-hashes)) — no native bindings, no `node-gyp`, no prebuilds to verify
- Dual ESM + CommonJS distribution with TypeScript declarations
- Single-file browser bundle (UMD/IIFE, global `dsteem`)
- Same public API as v0.11.x — drop-in upgrade

## Install

```sh
npm install dsteem
```

Requires **Node.js 22 LTS or newer**. (v0.11.x supported older Node; v0.12 dropped the native `secp256k1` build and the dead browser polyfills along with it.)

## Quick start (Node)

```ts
import {Client} from 'dsteem'

const client = new Client('https://api.steemit.com')
// or, if the primary is down:
// const client = new Client('https://api.moecki.online')

for await (const block of client.blockchain.getBlocks()) {
    console.log(`New block, id: ${block.block_id}`)
}
```

```js
const {Client, PrivateKey} = require('dsteem')

const client = new Client('https://api.steemit.com')
const key = PrivateKey.fromLogin('username', 'password', 'posting')

client.broadcast.vote({
    voter: 'username',
    author: 'almost-digital',
    permlink: 'dsteem-is-the-best',
    weight: 10000
}, key).then(({block_num}) => console.log('Included in block:', block_num))
```

## Quick start (browser)

```html
<script src="https://unpkg.com/dsteem@^0.12/dist/dsteem.browser.global.js"></script>
<script>
    const client = new dsteem.Client('https://api.steemit.com')
    client.database.getDiscussions('trending', {tag: 'writing', limit: 1}).then(([post]) => {
        document.body.innerHTML = `<h1>${post.title}</h1><h2>by ${post.author}</h2>`
    })
</script>
```

The browser bundle inlines a Node `Buffer` polyfill (~20 KB) — consumers don't need to set anything up.

When using a bundler (webpack/vite/rollup), `import {Client} from 'dsteem'` resolves to the ESM build automatically.

## API

Full API reference: <https://jnordberg.github.io/dsteem/>

The public surface preserved from v0.11.x: `Client`, `PrivateKey`, `PublicKey`, `Signature`, `cryptoUtils`, `Asset`, `Price`, `Transaction`, `Operation`, `Types`, all of the `*Operation` interfaces, `Blockchain`, `DatabaseAPI`, `BroadcastAPI`, `RCAPI`, and the `utils` helpers (including `buildWitnessUpdateOp`).

## Network

Default RPC for code samples is `https://api.steemit.com`. A community-maintained fallback is `https://api.moecki.online`. Set the URL when constructing `Client`.

## What changed in v0.12

- **Crypto:** native `secp256k1` (high-severity CVE in 3.x) + `Node:crypto.createHash` → pure-JS [`@noble/curves`](https://github.com/paulmillr/noble-curves) + [`@noble/hashes`](https://github.com/paulmillr/noble-hashes). Public API unchanged; signatures are still canonical (`isCanonicalSignature`) and accepted by Steem nodes. Old on-chain signatures still verify with the new backend.
- **Bundle:** browserify + tsify + babelify + uglifyjs + dts-generator → [`tsup`](https://tsup.egoist.dev/) (esbuild). Browser bundle dropped from 782 KB → 351 KB.
- **Polyfills:** `core-js@2`, `regenerator-runtime`, `whatwg-fetch`, `node-fetch` — all removed. Modern browsers and Node 22+ provide everything natively.
- **Module format:** dual ESM + CJS via the `exports` map; no more `lib/` directory or build-time `version.js` rewrite.
- **TypeScript:** 3.1 → 5.x, with strict mode (`strictNullChecks`, `noImplicitAny`, `noImplicitThis`).
- **Lint:** `tslint` (deprecated) → ESLint 9 flat config + `typescript-eslint` 8.
- **Tests:** mocha 5 → 11, `nyc` → `c8` (70 % coverage gate). Karma + Sauce Labs browser tests → Playwright (Chromium/Firefox/WebKit headless).
- **CI:** CircleCI + Travis → GitHub Actions, matrix on Node 22 + Node 24.

`dist/` contents:

| File | Purpose |
|---|---|
| `dist/index.mjs` | ESM entry (Node) |
| `dist/index.cjs` | CommonJS entry (Node) |
| `dist/index.d.ts` | TypeScript declarations |
| `dist/dsteem.browser.global.js` | Browser IIFE (global `dsteem`), inlines all deps + Buffer polyfill |

## License

BSD-3-Clause — see [LICENSE](./LICENSE).

---

*Share and Enjoy!*
