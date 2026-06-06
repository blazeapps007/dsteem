/**
 * Golden-vector test for the @noble crypto swap (Phase 4 of the modernization).
 *
 * Hash + serialization output IS byte-deterministic across crypto backends, so
 * the corresponding fields in test/fixtures/crypto-golden.json are asserted
 * byte-exact. Signatures are NOT byte-deterministic across ECDSA libraries
 * (RFC 6979 + extraEntropy mixing differs between implementations), so we test
 * signatures semantically:
 *   1. Fresh signatures verify against the expected pubkey for the message.
 *   2. Fresh signatures recover to the expected pubkey.
 *   3. Fresh signatures pass steemd's isCanonicalSignature byte-pattern check.
 *   4. The HISTORICAL signatures frozen in the JSON (produced by secp256k1@3.x)
 *      still verify + recover correctly with the new backend — proves we can
 *      still read pre-existing on-chain signatures.
 */

import 'mocha'
import assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import {generateFixtures, Fixtures} from './fixtures/generator'
import {PrivateKey, PublicKey, Signature, cryptoUtils} from '../src/crypto'

describe('crypto golden vectors', function() {
    this.timeout(30000)

    let golden: Fixtures
    let fresh: Fixtures

    before(() => {
        const goldenPath = path.join(__dirname, 'fixtures', 'crypto-golden.json')
        if (!fs.existsSync(goldenPath)) {
            throw new Error(
                `Golden fixture file missing at ${goldenPath}. ` +
                `Run "npx ts-node test/fixtures/build-golden.ts" to regenerate.`
            )
        }
        golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'))
        fresh = generateFixtures()
    })

    it('matches version', () => {
        assert.strictEqual(fresh.version, golden.version)
    })

    it('reproduces all hash vectors (byte-exact)', () => {
        assert.strictEqual(fresh.hashes.length, golden.hashes.length)
        for (let i = 0; i < golden.hashes.length; i++) {
            assert.deepStrictEqual(fresh.hashes[i], golden.hashes[i], `hash vector ${i} mismatch`)
        }
    })

    it('signature vectors: fresh sigs are canonical + verify + recover correctly', () => {
        assert.strictEqual(fresh.signatures.length, golden.signatures.length)
        for (let i = 0; i < golden.signatures.length; i++) {
            const g = golden.signatures[i]
            const f = fresh.signatures[i]

            // Deterministic identity properties — must match exactly.
            assert.strictEqual(f.seed, g.seed, `vec ${i}: seed`)
            assert.strictEqual(f.privKeyWif, g.privKeyWif, `vec ${i}: priv key WIF (sha256-of-seed should be deterministic)`)
            assert.strictEqual(f.pubKeyStr, g.pubKeyStr, `vec ${i}: pub key (derived from priv key, deterministic)`)
            assert.strictEqual(f.messageHex, g.messageHex, `vec ${i}: message (sha256-of-string, deterministic)`)
            assert.strictEqual(f.recoveredPubKeyStr, g.recoveredPubKeyStr, `vec ${i}: recovered pubkey`)
            assert.strictEqual(f.recoveredPubKeyStr, f.pubKeyStr, `vec ${i}: fresh sig recovers to signer's pubkey`)

            // Fresh signature must verify + be canonical.
            const pub = PublicKey.fromString(f.pubKeyStr)
            const sig = Signature.fromString(f.signatureHex)
            const msg = Buffer.from(f.messageHex, 'hex')
            assert(pub.verify(msg, sig), `vec ${i}: fresh sig must verify against own pubkey`)
            assert(cryptoUtils.isCanonicalSignature(sig.data), `vec ${i}: fresh sig must be canonical`)
        }
    })

    it('historical signatures (frozen v0.11.3 bytes) still verify + recover with new backend', () => {
        // Cross-validation: signatures produced by secp256k1@3.x must remain
        // verifiable by @noble. Proves we can still read existing on-chain sigs.
        for (let i = 0; i < golden.signatures.length; i++) {
            const g = golden.signatures[i]
            const pub = PublicKey.fromString(g.pubKeyStr)
            const sig = Signature.fromString(g.signatureHex)
            const msg = Buffer.from(g.messageHex, 'hex')
            assert(pub.verify(msg, sig), `historical vec ${i}: must verify with new backend`)
            const recovered = sig.recover(msg)
            assert.strictEqual(recovered.toString(), g.recoveredPubKeyStr, `historical vec ${i}: must recover correctly`)
        }
    })

    it('transaction-digest vectors: digests are byte-exact, signatures verify', () => {
        assert.strictEqual(fresh.transactions.length, golden.transactions.length)
        for (let i = 0; i < golden.transactions.length; i++) {
            const g = golden.transactions[i]
            const f = fresh.transactions[i]

            // Transaction digest (sha256 of chainId + serialized tx) is byte-deterministic.
            assert.strictEqual(f.label, g.label)
            assert.strictEqual(f.chainIdHex, g.chainIdHex)
            assert.strictEqual(f.privKeyWif, g.privKeyWif)
            assert.strictEqual(f.digestHex, g.digestHex, `tx ${g.label}: digest must be byte-exact`)
            assert.deepStrictEqual(f.transaction, g.transaction, `tx ${g.label}: transaction`)

            // Derive signer's pubkey from the private-key WIF (deterministic).
            const digest = Buffer.from(f.digestHex, 'hex')
            const signerPub = PrivateKey.fromString(g.privKeyWif).createPublic()

            // Fresh signature must verify + be canonical + recover to signer.
            const sig = Signature.fromString(f.signatureHex)
            assert(cryptoUtils.isCanonicalSignature(sig.data), `tx ${g.label}: fresh sig must be canonical`)
            assert(signerPub.verify(digest, sig), `tx ${g.label}: fresh sig must verify`)
            assert.strictEqual(sig.recover(digest).toString(), signerPub.toString(), `tx ${g.label}: fresh sig must recover to signer`)

            // Historical signature (from secp256k1@3.x) must also still verify
            // and recover — proves backward compatibility with on-chain history.
            const historicalSig = Signature.fromString(g.signatureHex)
            assert(signerPub.verify(digest, historicalSig), `tx ${g.label}: historical sig must verify with new backend`)
            assert.strictEqual(historicalSig.recover(digest).toString(), signerPub.toString(), `tx ${g.label}: historical sig must recover to signer`)
        }
    })
})
