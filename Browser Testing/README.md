# dsteem Browser Testing Harness

Manual, form-driven testing harness for every Steem operation type supported by `dsteem`. Loads the IIFE browser bundle (`dist/dsteem.browser.global.js`) directly into a static HTML page so you can fill in fields, sign with a pasted key, inspect the signed transaction, and (opt-in) broadcast it to a live Steem RPC endpoint.

This is a developer / community tool — not part of CI — for validating that every op type round-trips through the browser build before tagging `v0.12.0`.

**Live deployment (auto-built from `BlazeDevelopment`):** <https://blazeapps007.github.io/dsteem/harness/>

The deployed copy is byte-identical to what's in this folder, with `dsteem` installed **from the local repo** (not from the npm registry — `dsteem@0.11.x` on npm is the unmodernized version). After `v0.12.0` is published under the planned `blazesteem` name on npm, this harness will switch to that.

---

## Safety first — read this

This harness asks you to paste a private key into a webpage. That is dangerous if misused. Mitigations are in place, but you are responsible for following these rules:

1. **Use a dedicated test account.** Never use your main account's funds.
2. **Never paste your owner key.** Posting is enough for vote/comment/custom_json. Active is enough for everything wallet/market/witness-related. Owner is only needed for the recovery ops — and on a throwaway test account.
3. **Never run this on a shared or untrusted machine.**
4. **Default mode is `Build & Sign only`** — the harness does NOT broadcast unless you tick the per-form `Broadcast` checkbox. Use Build-only mode to inspect what would be sent before you commit.
5. **Keys are never persisted.** The account name and RPC selection survive page reload (in `localStorage`); the private key field is always cleared on reload.
6. **Mainnet broadcasts are real and irreversible.** The harness shows a red banner when you're on mainnet. There is no "are you sure" modal — the per-op `Broadcast` checkbox is the confirmation.

---

## Quick start (local)

The harness loads `dsteem` from the **local repo** via `npm install file:..`, so the parent must be built first.

```sh
# 1. Build the parent (one time, or after pulling new code)
cd ..
npm install
npm run build

# 2. Install the harness's deps + copy the IIFE bundle into lib/
cd "Browser Testing"
npm install      # postinstall runs setup.js, which copies node_modules/dsteem/dist/dsteem.browser.global.js → lib/

# 3. Start a local web server
npm run serve
# → http-server listening on http://localhost:8080
```

Open <http://localhost:8080/> in any modern browser. You should see the `dsteem v0.12.0` harness page. If the page shows "dsteem global missing — bundle did not load", you skipped step 1 (so `lib/dsteem.browser.global.js` doesn't exist). Re-run `npm install` (or `npm run setup`) in this folder once `../dist/` is populated.

## How GitHub Pages deploys this

The repo's `.github/workflows/pages.yml` builds **both** the typedoc API reference and this harness, then deploys them as a single Pages artifact:

| URL                                                            | What             |
|----------------------------------------------------------------|------------------|
| `https://blazeapps007.github.io/dsteem/`                       | API reference    |
| `https://blazeapps007.github.io/dsteem/harness/`               | This harness     |

The workflow runs `npm run build` at the repo root (produces `dist/dsteem.browser.global.js`), then `npm install` inside `Browser Testing/` (which pulls dsteem from `file:..` and triggers `setup.js` to copy the bundle into `lib/`), then assembles `_site/` with the docs at the root and the harness under `harness/`. **No npm-registry install of `dsteem` happens** — the harness always uses the source-tree build.

After publication under a new package name (planned: `blazesteem`), swap `"dsteem": "file:.."` in [package.json](package.json) for the published version and the rest of the harness keeps working.

---

## What's covered

All **46 operations** in the Steem operation set, organized into 10 tabs:

| Tab | Operations |
|---|---|
| **Account** | `account_create`, `account_create_with_delegation`, `create_claimed_account`, `claim_account`, `account_update`, `account_update2`, `change_recovery_account` |
| **Content** | `comment`, `comment_options`, `delete_comment`, `vote` |
| **Wallet** | `transfer`, `transfer_to_savings`, `transfer_from_savings`, `cancel_transfer_from_savings`, `claim_reward_balance` |
| **Power** | `transfer_to_vesting`, `withdraw_vesting`, `set_withdraw_vesting_route`, `delegate_vesting_shares` |
| **Market** | `feed_publish`, `convert`, `limit_order_create`, `limit_order_create2`, `limit_order_cancel`, `decline_voting_rights` |
| **Escrow** | `escrow_transfer`, `escrow_approve`, `escrow_dispute`, `escrow_release` |
| **Witness** | `witness_update`, `witness_set_properties`, `account_witness_vote`, `account_witness_proxy` |
| **Custom** | `custom_json`, `custom_binary`, `custom` |
| **Governance** | `create_proposal`, `update_proposal_votes`, `remove_proposal` |
| **Recovery / Legacy** | `request_account_recovery`, `recover_account`, `reset_account`, `set_reset_account`, `pow`, `pow2`, `report_over_production` |

Plus a **Lookups** panel for read-only `getAccounts`, `getDynamicGlobalProperties`, `getRCMana`, `getVPMana`, and `getDiscussions` — useful for inspecting state before/after a broadcast.

Each op shows the required key authority (`posting` / `active` / `owner`) in the form header. The harness does not block you from signing with the wrong role — steemd will reject the broadcast and the error will render in the output panel.

---

## How to use a form

1. Pick your **RPC endpoint** in the top bar. Default is `https://api.steemit.com`; fallback is `https://api.moecki.online`. You can paste any other endpoint.
2. Enter the **account name** you'll sign as (e.g. `blaze.apps`). This is persisted across reloads.
3. Choose a **key input mode**:
   - **WIF** — paste a `5...` WIF private key.
   - **Login** — username + password + role; the harness derives the WIF via `PrivateKey.fromLogin`.
4. The **derived public key** displays under the key input. Compare it to the `key_auths` on the account (use the Lookups panel) to confirm you have the right role.
5. Pick a tab, fill in a form, click **`Build & Sign`**. The output panel shows the signed transaction JSON.
6. To broadcast: tick the per-form **`Broadcast`** checkbox, then click **`Broadcast`**. The output panel shows either a `TransactionConfirmation` (with `block_num` and `id`) or the steemd error.

---

## Architecture

- `index.html` — UI scaffold (top bar, tabs, lookup panel, output panel)
- `css/styles.css` — dark theme, tabs, mainnet warning banner
- `js/app.js` — bootstrap; manages RPC/key/account state; wires lookup panel; selects active tab
- `js/form-builder.js` — `registerOp({tab, name, auth, fields, build, broadcast, render})` helper; renders forms from schemas, handles Build & Sign / Broadcast clicks
- `js/output.js` — color-coded, timestamped log of every BUILD / SIGNED / BROADCAST / ERROR
- `js/lookups.js` — `getAccounts`, `getDynamicGlobalProperties`, `getRCMana`, `getVPMana`, `getDiscussions`
- `js/ops-*.js` — one file per tab, each calls `registerOp(...)` for every op in that tab

### How to add an op

If a new op lands in `dsteem`'s `Operation` union, drop a new `registerOp({...})` block into the appropriate `js/ops-*.js` file. For simple ops, use the `fields` schema path:

```js
registerOp({
    tab: 'wallet',
    name: 'transfer',
    auth: 'active',
    fields: [
        {name: 'from',   type: 'text',     default: ''},
        {name: 'to',     type: 'text',     default: ''},
        {name: 'amount', type: 'text',     default: '0.001 STEEM'},
        {name: 'memo',   type: 'textarea', default: ''}
    ],
    build: (v) => ['transfer', v],
    broadcast: (c, v, k) => c.broadcast.transfer(v, k)
})
```

For ops with nested structures (authorities, beneficiaries, hex blobs), use the `render(container, ctx)` hook to build the DOM by hand.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Page says "dsteem global missing — bundle did not load" | You didn't run `npm install` here, or `npm run build` in the parent. Re-do both. |
| `tx_missing_active_auth` / `tx_missing_posting_auth` from steemd | You signed with the wrong key role. Active is needed for transfer/market/witness ops; posting for vote/comment/custom_json. |
| `not enough RC` | Your account is out of resource credits. Wait for regen, delegate VESTS to it, or use a different account. |
| `assert_exception ... fee` on `account_create` | The `fee` field must exactly equal the chain's current `account_creation_fee`. Pull it via the Lookups panel (`getChainProperties`) before submitting. |
| Bundle loads but `window.dsteem.VERSION` is wrong | You're running an old build. `cd .. && npm run build` then `cd "Browser Testing" && npm install` to refresh `node_modules/dsteem/`. |

---

## License

BSD-3-Clause, same as parent.
