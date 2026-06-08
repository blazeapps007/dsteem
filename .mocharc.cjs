// Mocha runner config. ts-node compiles test/ + src/ on demand.
//
// Default suite runs ONLY the deterministic, offline tests so CI is reliable.
// Tests that hit a live Steem RPC node are gated inside the describe blocks
// via TEST_MAINNET=1 (api.steemit.com / api.moecki.online) and TEST_TESTNET=1
// (legacy testnet.steem.vc; almost certainly dead in 2026).
//
// Use `npm run test:all` to run everything against TEST_NODE/TEST_NODE_FALLBACK.
module.exports = {
    require: ['ts-node/register'],
    extension: ['ts'],
    spec: ['test/crypto.ts', 'test/crypto-golden.ts', 'test/serializers.ts', 'test/asset.ts', 'test/misc.ts'],
    exit: true,
    timeout: 60000
}
