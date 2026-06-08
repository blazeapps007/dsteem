/* Wallet operations: transfer, transfer_to_savings, transfer_from_savings, cancel_transfer_from_savings, claim_reward_balance */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }

    registerOp({
        tab: 'wallet', name: 'transfer', auth: 'active',
        fields: [
            {name: 'from',   type: 'text', default: ''},
            {name: 'to',     type: 'text', default: ''},
            {name: 'amount', type: 'text', default: '0.001 STEEM', hint: 'Asset string: "1.000 STEEM" or "1.000 SBD"'},
            {name: 'memo',   type: 'textarea', default: ''}
        ],
        build: (v) => ['transfer', v],
        broadcast: (c, v, k) => c.broadcast.transfer(v, k)
    })

    registerOp({
        tab: 'wallet', name: 'transfer_to_savings', auth: 'active',
        fields: [
            {name: 'from',       type: 'text',   default: ''},
            {name: 'to',         type: 'text',   default: ''},
            {name: 'amount',     type: 'text',   default: '0.001 STEEM'},
            {name: 'memo',       type: 'textarea', default: ''},
            {name: 'request_id', type: 'number', default: Date.now() & 0xffffffff, hint: 'uint32_t, unique per active request'}
        ],
        build: (v) => ['transfer_to_savings', {
            from: v.from, to: v.to, amount: v.amount, memo: v.memo, request_id: Number(v.request_id)
        }]
    })

    registerOp({
        tab: 'wallet', name: 'transfer_from_savings', auth: 'active',
        fields: [
            {name: 'from',       type: 'text',   default: ''},
            {name: 'request_id', type: 'number', default: Date.now() & 0xffffffff},
            {name: 'to',         type: 'text',   default: ''},
            {name: 'amount',     type: 'text',   default: '0.001 STEEM'},
            {name: 'memo',       type: 'textarea', default: ''}
        ],
        build: (v) => ['transfer_from_savings', {
            from: v.from, request_id: Number(v.request_id), to: v.to, amount: v.amount, memo: v.memo
        }]
    })

    registerOp({
        tab: 'wallet', name: 'cancel_transfer_from_savings', auth: 'active',
        fields: [
            {name: 'from',       type: 'text',   default: ''},
            {name: 'request_id', type: 'number', default: 0, hint: 'must match an in-flight request'}
        ],
        build: (v) => ['cancel_transfer_from_savings', {from: v.from, request_id: Number(v.request_id)}]
    })

    registerOp({
        tab: 'wallet', name: 'claim_reward_balance', auth: 'posting',
        description: 'Claim pending author/curation rewards into liquid balances.',
        fields: [
            {name: 'account',      type: 'text', default: ''},
            {name: 'reward_steem', type: 'text', default: '0.000 STEEM'},
            {name: 'reward_sbd',   type: 'text', default: '0.000 SBD'},
            {name: 'reward_vests', type: 'text', default: '0.000000 VESTS'}
        ],
        build: (v) => ['claim_reward_balance', v]
    })
})()
