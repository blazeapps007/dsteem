/* Power operations: transfer_to_vesting, withdraw_vesting, set_withdraw_vesting_route, delegate_vesting_shares */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }

    registerOp({
        tab: 'power', name: 'transfer_to_vesting', auth: 'active',
        description: 'Power up. amount must be STEEM, never SBD/VESTS.',
        fields: [
            {name: 'from',   type: 'text', default: ''},
            {name: 'to',     type: 'text', default: '', hint: 'usually same as from'},
            {name: 'amount', type: 'text', default: '0.001 STEEM'}
        ],
        build: (v) => ['transfer_to_vesting', v]
    })

    registerOp({
        tab: 'power', name: 'withdraw_vesting', auth: 'active',
        description: 'Power down. vesting_shares must be VESTS. Set to "0.000000 VESTS" to cancel a power-down.',
        fields: [
            {name: 'account',        type: 'text', default: ''},
            {name: 'vesting_shares', type: 'text', default: '0.000000 VESTS'}
        ],
        build: (v) => ['withdraw_vesting', v]
    })

    registerOp({
        tab: 'power', name: 'set_withdraw_vesting_route', auth: 'active',
        fields: [
            {name: 'from_account', type: 'text',   default: ''},
            {name: 'to_account',   type: 'text',   default: ''},
            {name: 'percent',      type: 'number', default: 10000, hint: '100% = 10000 (uint16, 0–10000)'},
            {name: 'auto_vest',    type: 'checkbox', default: false, hint: 'if true, route stays as VESTS instead of STEEM'}
        ],
        build: (v) => ['set_withdraw_vesting_route', {
            from_account: v.from_account,
            to_account: v.to_account,
            percent: Number(v.percent),
            auto_vest: !!v.auto_vest
        }]
    })

    registerOp({
        tab: 'power', name: 'delegate_vesting_shares', auth: 'active',
        description: 'Set absolute delegation amount. 0 VESTS = remove delegation (1-week cooldown).',
        fields: [
            {name: 'delegator',      type: 'text', default: ''},
            {name: 'delegatee',      type: 'text', default: ''},
            {name: 'vesting_shares', type: 'text', default: '0.000000 VESTS'}
        ],
        build: (v) => ['delegate_vesting_shares', v],
        broadcast: (c, v, k) => c.broadcast.delegateVestingShares(v, k)
    })
})()
