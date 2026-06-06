/**
 * Deterministic crypto fixture generator. Re-runnable across the @noble swap —
 * output MUST remain byte-identical to test/fixtures/crypto-golden.json after
 * Phase 4 to prove the new crypto backend produces signatures/digests that
 * Steem nodes will still accept.
 */

import {PrivateKey, cryptoUtils} from '../../src/crypto'
import {Transaction} from '../../src/steem/transaction'
import {Operation} from '../../src/steem/operation'

const MAINNET_CHAIN_ID = Buffer.alloc(32, 0)
const TESTNET_CHAIN_ID = Buffer.from(
    '79276aea5d4877d9a25892eaa01b0adf019d3e5cb12a97478df3298ccdd01673',
    'hex'
)

const HASH_INPUTS = [
    '',
    'a',
    'abc',
    'The quick brown fox jumps over the lazy dog',
    'dsteem golden fixture 0001',
    'dsteem golden fixture 0002',
    'dsteem golden fixture 0003',
    'dsteem golden fixture 0004',
    'dsteem golden fixture 0005',
    Buffer.alloc(64, 0xab).toString('binary')
]

const SIGN_SEEDS = [
    'dsteem-seed-01', 'dsteem-seed-02', 'dsteem-seed-03', 'dsteem-seed-04',
    'dsteem-seed-05', 'dsteem-seed-06', 'dsteem-seed-07', 'dsteem-seed-08',
    'dsteem-seed-09', 'dsteem-seed-10'
]

const SIGN_MESSAGES = SIGN_SEEDS.map((s, i) =>
    cryptoUtils.sha256(`msg-${i}-${s}`)
)

const FIXED_TRANSACTIONS: Array<{tx: Transaction, chainId: Buffer, seedIndex: number, label: string}> = [
    {
        label: 'mainnet-vote',
        chainId: MAINNET_CHAIN_ID,
        seedIndex: 0,
        tx: {
            ref_block_num: 1234,
            ref_block_prefix: 0x12345678,
            expiration: '2025-01-01T00:00:00',
            operations: [
                ['vote', {voter: 'alice', author: 'bob', permlink: 'hello', weight: 10000}] as Operation
            ],
            extensions: []
        }
    },
    {
        label: 'mainnet-transfer',
        chainId: MAINNET_CHAIN_ID,
        seedIndex: 1,
        tx: {
            ref_block_num: 5,
            ref_block_prefix: 0xdeadbeef,
            expiration: '2025-06-15T12:34:56',
            operations: [
                ['transfer', {from: 'alice', to: 'bob', amount: '1.000 STEEM', memo: 'hi'}] as Operation
            ],
            extensions: []
        }
    },
    {
        label: 'testnet-custom_json',
        chainId: TESTNET_CHAIN_ID,
        seedIndex: 2,
        tx: {
            ref_block_num: 99,
            ref_block_prefix: 0x11223344,
            expiration: '2025-12-31T23:59:59',
            operations: [
                ['custom_json', {
                    required_auths: [],
                    required_posting_auths: ['alice'],
                    id: 'follow',
                    json: '["follow",{"follower":"alice","following":"bob","what":["blog"]}]'
                }] as Operation
            ],
            extensions: []
        }
    },
    {
        label: 'mainnet-multi-op',
        chainId: MAINNET_CHAIN_ID,
        seedIndex: 3,
        tx: {
            ref_block_num: 42,
            ref_block_prefix: 0xcafebabe,
            expiration: '2025-07-04T00:00:00',
            operations: [
                ['vote', {voter: 'a', author: 'b', permlink: 'c', weight: -10000}] as Operation,
                ['vote', {voter: 'a', author: 'b', permlink: 'd', weight: 5000}] as Operation
            ],
            extensions: []
        }
    },
    {
        label: 'mainnet-empty-extensions',
        chainId: MAINNET_CHAIN_ID,
        seedIndex: 4,
        tx: {
            ref_block_num: 0,
            ref_block_prefix: 0,
            expiration: '2020-01-01T00:00:00',
            operations: [
                ['transfer', {from: 'x', to: 'y', amount: '0.001 STEEM', memo: ''}] as Operation
            ],
            extensions: []
        }
    }
]

export interface HashVector {
    inputUtf8: string
    inputHex: string
    sha256Hex: string
    ripemd160Hex: string
    doubleSha256Hex: string
}

export interface SignVector {
    seed: string
    privKeyWif: string
    pubKeyStr: string
    messageHex: string
    signatureHex: string
    recoveredPubKeyStr: string
}

export interface TxVector {
    label: string
    chainIdHex: string
    seed: string
    privKeyWif: string
    transaction: Transaction
    digestHex: string
    signatureHex: string
}

export interface Fixtures {
    version: 1
    hashes: HashVector[]
    signatures: SignVector[]
    transactions: TxVector[]
}

export function generateFixtures(): Fixtures {
    const hashes: HashVector[] = HASH_INPUTS.map((input) => {
        const buf = Buffer.from(input, input === HASH_INPUTS[HASH_INPUTS.length - 1] ? 'binary' : 'utf8')
        return {
            inputUtf8: input,
            inputHex: buf.toString('hex'),
            sha256Hex: cryptoUtils.sha256(buf).toString('hex'),
            ripemd160Hex: cryptoUtils.ripemd160(buf).toString('hex'),
            doubleSha256Hex: cryptoUtils.doubleSha256(buf).toString('hex')
        }
    })

    const signatures: SignVector[] = SIGN_SEEDS.map((seed, i) => {
        const priv = PrivateKey.fromSeed(seed)
        const pub = priv.createPublic()
        const msg = SIGN_MESSAGES[i]
        const sig = priv.sign(msg)
        const recovered = sig.recover(msg)
        return {
            seed,
            privKeyWif: priv.toString(),
            pubKeyStr: pub.toString(),
            messageHex: msg.toString('hex'),
            signatureHex: sig.toString(),
            recoveredPubKeyStr: recovered.toString()
        }
    })

    const transactions: TxVector[] = FIXED_TRANSACTIONS.map(({tx, chainId, seedIndex, label}) => {
        const seed = SIGN_SEEDS[seedIndex]
        const priv = PrivateKey.fromSeed(seed)
        const digest = cryptoUtils.transactionDigest(tx, chainId)
        const signed = cryptoUtils.signTransaction(tx, priv, chainId)
        return {
            label,
            chainIdHex: chainId.toString('hex'),
            seed,
            privKeyWif: priv.toString(),
            transaction: tx,
            digestHex: digest.toString('hex'),
            signatureHex: signed.signatures[0]
        }
    })

    return {version: 1, hashes, signatures, transactions}
}
