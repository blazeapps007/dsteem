# @blazeapps/dsteem

[![CI](https://github.com/blazeapps007/dsteem/actions/workflows/ci.yml/badge.svg?branch=BlazeDevelopment)](https://github.com/blazeapps007/dsteem/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@blazeapps/dsteem.svg)](https://www.npmjs.com/package/@blazeapps/dsteem)
[![Docs](https://img.shields.io/badge/docs-typedoc-blue?style=flat-square)](https://blazeapps007.github.io/dsteem/)

Modernized fork of [`dsteem`](https://github.com/jnordberg/dsteem) — a robust [Steem blockchain](https://steem.io) RPC client for Node.js and browsers. Published as `@blazeapps/dsteem` so the original `dsteem@0.11.x` on npm is untouched; the public API is unchanged so a drop-in import-rename is the only consumer change.

- Pure-JS cryptography ([`@noble/curves`](https://github.com/paulmillr/noble-curves), [`@noble/hashes`](https://github.com/paulmillr/noble-hashes)) — no native bindings, no `node-gyp`, no prebuilds to verify
- Dual ESM + CommonJS distribution with TypeScript declarations
- Single-file browser bundle (UMD/IIFE, global `dsteem`)
- Same public API as v0.11.x — drop-in upgrade

## Install

```sh
npm install @blazeapps/dsteem
```

Requires **Node.js 22 LTS or newer**. (v0.11.x supported older Node; v0.12 dropped the native `secp256k1` build and the dead browser polyfills along with it.)

**Migrating from the legacy `dsteem`:** rename every `'dsteem'` import to `'@blazeapps/dsteem'`. The public API is identical — no other changes needed. See [What changed in v0.12](#what-changed-in-v012) for the under-the-hood swaps.

## Quick start (Node)

```ts
import {Client} from '@blazeapps/dsteem'

const client = new Client('https://api.steemit.com')
// or, if the primary is down:
// const client = new Client('https://api.moecki.online')

for await (const block of client.blockchain.getBlocks()) {
    console.log(`New block, id: ${block.block_id}`)
}
```

```js
const {Client, PrivateKey} = require('@blazeapps/dsteem')

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
<script src="https://unpkg.com/@blazeapps/dsteem@^0.12/dist/dsteem.browser.global.js"></script>
<script>
    const client = new dsteem.Client('https://api.steemit.com')
    client.database.getDiscussions('trending', {tag: 'writing', limit: 1}).then(([post]) => {
        document.body.innerHTML = `<h1>${post.title}</h1><h2>by ${post.author}</h2>`
    })
</script>
```

The browser bundle inlines a Node `Buffer` polyfill (~20 KB) — consumers don't need to set anything up. The IIFE bundle still exposes the global as `window.dsteem` for drop-in compatibility with v0.11.x browser snippets.

When using a bundler (webpack/vite/rollup), `import {Client} from '@blazeapps/dsteem'` resolves to the ESM build automatically.

## Browser Testing Harness

A static HTML harness for **manual, form-driven testing of every dsteem operation** lives in [`Browser Testing/`](./Browser%20Testing/) and is deployed alongside the docs:

- **Live**: <https://blazeapps007.github.io/dsteem/harness/>
- **Coverage**: forms for all 47 Steem operations (account, content, wallet, power, market, escrow, witness, custom, governance, recovery/legacy)
- **Lookup panel**: `getAccounts`, `getDynamicGlobalProperties`, RC/VP mana, raw `client.call` — no key required
- **Safety**: defaults to `Build & Sign only`; broadcasting requires a per-form opt-in; keys are never persisted
- **Install model**: pulls `dsteem` from the local repo via `"dsteem": "file:.."` — never from the npm registry — so the harness always tests what's in this tree

Run it locally:

```sh
npm install && npm run build         # at repo root — produces dist/
cd "Browser Testing" && npm install  # postinstall copies the IIFE bundle into lib/
npm run serve                        # → http://localhost:8080
```

The Pages workflow ([.github/workflows/pages.yml](.github/workflows/pages.yml)) builds the harness in CI and serves it under `/harness/`. See [`Browser Testing/README.md`](./Browser%20Testing/README.md) for full safety rules and per-op notes.

## API

Full API reference: <https://blazeapps007.github.io/dsteem/>

Public surface (everything `v0.11.x` exported is still exported the same way):

- **Core**: `Client`, `PrivateKey`, `PublicKey`, `Signature`, `cryptoUtils`
- **Domain types**: `Asset`, `Price`, `Transaction`, `SignedTransaction`, `Operation`, `Types`, all of the `*Operation` interfaces
- **API helpers**: `Blockchain`, `DatabaseAPI`, `BroadcastAPI`, `RCAPI`
- **Utility helpers**: the `utils` namespace (including `buildWitnessUpdateOp`)

New in `v0.12.0` — additive only (no breaking changes): `BroadcastAPI`, `CreateAccountOptions`, and the resource-credit interfaces (`RCAccount`, `RCParams`, `RCPool`, `Manabar`, `Resource`, `Pool`, `DynamicParam`, `PriceCurveParam`) are now directly importable from the package root, so TypeScript consumers can write `import type {Manabar} from '@blazeapps/dsteem'` instead of digging the type out of a class signature.

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
