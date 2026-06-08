# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`dsteem` is a TypeScript RPC client library for the Steem blockchain. v0.12.0 is a modernization of the long-stale v0.11.3 codebase: it preserves the public API exactly but replaces the entire toolchain underneath. There is a single source tree that ships as a Node.js package (dual ESM + CommonJS) plus a standalone browser IIFE bundle.

Entry points:
- Node: [src/index-node.ts](src/index-node.ts) (re-exports [src/index.ts](src/index.ts))
- Browser: [src/index-browser.ts](src/index-browser.ts) (same re-export; bundled separately so `esbuild-plugin-polyfill-node` can inline `Buffer` for the browser)

`package.json` `exports` map drives resolution: ESM consumers get `dist/index.mjs`, CJS consumers get `dist/index.cjs`, TypeScript consumers get `dist/index.d.ts`, browser bundlers fall through to `dist/dsteem.browser.global.js`.

## Build, test, lint

All driven by npm scripts (no more Makefile — the previous build assumed a BSD `sed -i ''` toolchain that didn't work on Windows or GNU sed).

- `npm run build` — [tsup](https://tsup.egoist.dev/) emits `dist/index.{cjs,mjs,d.ts}` and `dist/dsteem.browser.global.js` (+ source maps).
- `npm run lint` — ESLint 9 flat config ([eslint.config.mjs](eslint.config.mjs)).
- `npm test` — runs only the offline test slice (`crypto`, `crypto-golden`, `serializers`, `asset`, `misc`) via mocha 11 + ts-node. Configured in [.mocharc.cjs](.mocharc.cjs).
- `npm run test:all` — runs every `test/*.ts`, including the network-gated suites (which still skip unless `TEST_MAINNET=1` or `TEST_TESTNET=1`).
- `npm run coverage` — c8 with a 70 % line-coverage gate. Config in [.c8rc.json](.c8rc.json).
- `npm run test:browser` — builds, then runs Playwright against [test/browser-smoke.spec.ts](test/browser-smoke.spec.ts), loading the IIFE bundle into Chromium/Firefox/WebKit (browsers must be installed via `npx playwright install`).
- `npm run build:docs` — typedoc 0.28 emits HTML into `docs/`.

Single test file: `npx mocha test/<file>.ts` (mocharc takes care of ts-node + the right extensions).
Single test case: append `--grep 'name'`.

Live-network tests gate behind env vars (default off):
- `TEST_MAINNET=1` → read-only mainnet calls (`api.steemit.com`, fallback `api.moecki.online`).
- `TEST_TESTNET=1` → write tests / account creation against the legacy `testnet.steem.vc` (likely dead in 2026 — kept for completeness; no replacement testnet is wired in).

Override the RPC endpoint with `TEST_NODE=<url>` / `TEST_NODE_FALLBACK=<url>`.

## Architecture

**[Client](src/client.ts) is the only network primitive.** Every API method funnels through `Client.call(api, method, params)`, which JSON-RPC-encodes the request, posts it via `retryingFetch` ([src/utils.ts](src/utils.ts)), unwraps FC-style stack traces from `response.error`, and re-throws as a `VError` named `RPCError`. All retry, timeout, and backoff behavior lives here — helpers must not invent their own transport. Note the per-call `fetchTimeout` carve-out that skips timeouts for `network_broadcast_api` and `broadcast_transaction*` methods to avoid double-broadcasts.

**Helpers are thin wrappers over `Client.call`.** They live in `src/helpers/` and are exposed as instance properties on `Client`:
- `client.database` — read-only chain queries.
- `client.broadcast` — transaction construction + signing + submission. `sendOperations` fetches a recent block, builds a `Transaction`, signs with `cryptoUtils.signTransaction`, then calls `broadcast_transaction_synchronous`.
- `client.blockchain` — block iteration via async iterators and Node stream wrappers (`getBlockStream`).
- `client.rc` — resource credits.

**Domain types live in `src/steem/`** and are re-exported wholesale by `src/index.ts`:
- [operation.ts](src/steem/operation.ts) — discriminated-union `Operation` type covering every Steem op, with `OperationName` literal-union as the registry.
- [serializer.ts](src/steem/serializer.ts) — binary serializers for transaction signing. Adding a new op requires both an interface in `operation.ts` and a serializer entry here.
- `asset.ts`, `account.ts`, `block.ts`, `comment.ts`, `misc.ts`, `transaction.ts`, `rc.ts` — type definitions + a few small helper classes (`Asset`, `Price`, `HexBuffer`).

**[crypto.ts](src/crypto.ts)** wraps `@noble/curves` (secp256k1) and `@noble/hashes` (sha256, ripemd160) to provide `PrivateKey`/`PublicKey`/`Signature` with WIF + `STM`-prefixed encoding, and exposes `cryptoUtils.signTransaction` / `verifyTransaction` / `transactionDigest`. **The class signatures must remain byte-compatible with v0.11.x** — the golden-vector test in [test/crypto-golden.ts](test/crypto-golden.ts) enforces this with frozen fixtures generated against secp256k1@3.x in v0.11.3. Fresh signatures need not be byte-identical to the historical ones (different ECDSA libraries produce different valid signatures for the same key+message) but they MUST be canonical, verify against the signer's pubkey, and recover correctly — and the historical signatures from v0.11.3 MUST still verify with the new backend (proves on-chain backward compatibility).

The chain id (default all-zeros for mainnet) and address prefix come from `Client` and are network-configurable via `ClientOptions`. `Client.testnet()` still exists as before but its hard-coded URL (`testnet.steem.vc`) is likely dead — flag as a known footgun, don't remove it (public API preservation).

## Conventions

- ESLint config ([eslint.config.mjs](eslint.config.mjs)): 4-space indent, single quotes, **no semicolons**, no trailing commas. Match this when adding code — `npx eslint --fix` will rewrite to conform.
- Every source file carries the BSD-3-Clause header; preserve it when editing and copy it onto new files.
- `strict: true` in tsconfig (`strictNullChecks`, `noImplicitAny`, `noImplicitThis`). Target ES2022, module CommonJS for ts-node compatibility (tsup overrides this for the build output).
- Adding a new operation: add the interface to [src/steem/operation.ts](src/steem/operation.ts), register its serializer in [src/steem/serializer.ts](src/steem/serializer.ts), and if it's a common one, expose a typed convenience method on `BroadcastAPI`.
- Adding a new RPC method: prefer adding a typed wrapper on the appropriate helper rather than calling `client.call` from user code.
- Crypto changes: re-run `npm test -- --grep golden` after any change to [src/crypto.ts](src/crypto.ts) or [src/steem/serializer.ts](src/steem/serializer.ts) — the golden vectors catch silent regressions in signature canonicality, recovery semantics, or transaction-digest serialization that the rest of the test suite would not.
