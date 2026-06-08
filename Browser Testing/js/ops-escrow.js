/* Escrow ops: escrow_transfer, escrow_approve, escrow_dispute, escrow_release */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }

    function isoDaysFromNow(days) {
        return new Date(Date.now() + days * 86400 * 1000).toISOString().slice(0, 19)
    }

    registerOp({
        tab: 'escrow', name: 'escrow_transfer', auth: 'active',
        description: 'Propose an escrow. Once "from" submits, both "to" and "agent" must each escrow_approve before funds are held.',
        fields: [
            {name: 'from',                  type: 'text',   default: ''},
            {name: 'to',                    type: 'text',   default: ''},
            {name: 'agent',                 type: 'text',   default: ''},
            {name: 'escrow_id',             type: 'number', default: Date.now() & 0xffffffff, hint: 'uint32, unique per from'},
            {name: 'sbd_amount',            type: 'text',   default: '0.000 SBD'},
            {name: 'steem_amount',          type: 'text',   default: '0.001 STEEM'},
            {name: 'fee',                   type: 'text',   default: '0.001 STEEM', hint: 'paid to agent on approval'},
            {name: 'ratification_deadline', type: 'text',   default: isoDaysFromNow(1), hint: 'ISO, e.g. ' + isoDaysFromNow(1)},
            {name: 'escrow_expiration',     type: 'text',   default: isoDaysFromNow(30), hint: 'ISO, e.g. ' + isoDaysFromNow(30)},
            {name: 'json_meta',             type: 'textarea', default: '{}'}
        ],
        build: (v) => ['escrow_transfer', {
            from: v.from, to: v.to, agent: v.agent,
            escrow_id: Number(v.escrow_id),
            sbd_amount: v.sbd_amount, steem_amount: v.steem_amount, fee: v.fee,
            ratification_deadline: v.ratification_deadline,
            escrow_expiration: v.escrow_expiration,
            json_meta: v.json_meta
        }]
    })

    registerOp({
        tab: 'escrow', name: 'escrow_approve', auth: 'active',
        description: 'Either "to" or "agent" approves the escrow. Both must approve before funds are locked.',
        fields: [
            {name: 'from',      type: 'text',     default: ''},
            {name: 'to',        type: 'text',     default: ''},
            {name: 'agent',     type: 'text',     default: ''},
            {name: 'who',       type: 'text',     default: '', hint: 'must equal to OR agent'},
            {name: 'escrow_id', type: 'number',   default: 0},
            {name: 'approve',   type: 'checkbox', default: true}
        ],
        build: (v) => ['escrow_approve', {
            from: v.from, to: v.to, agent: v.agent, who: v.who,
            escrow_id: Number(v.escrow_id), approve: !!v.approve
        }]
    })

    registerOp({
        tab: 'escrow', name: 'escrow_dispute', auth: 'active',
        description: 'Either party raises a dispute. Once disputed, only the agent can release.',
        fields: [
            {name: 'from',      type: 'text',   default: ''},
            {name: 'to',        type: 'text',   default: ''},
            {name: 'agent',     type: 'text',   default: ''},
            {name: 'who',       type: 'text',   default: '', hint: 'who is disputing — must equal from OR to'},
            {name: 'escrow_id', type: 'number', default: 0}
        ],
        build: (v) => ['escrow_dispute', {
            from: v.from, to: v.to, agent: v.agent, who: v.who, escrow_id: Number(v.escrow_id)
        }]
    })

    registerOp({
        tab: 'escrow', name: 'escrow_release', auth: 'active',
        description: 'Release escrowed funds. Permission rules: see operation.ts EscrowReleaseOperation docstring.',
        fields: [
            {name: 'from',         type: 'text',   default: ''},
            {name: 'to',           type: 'text',   default: ''},
            {name: 'agent',        type: 'text',   default: ''},
            {name: 'who',          type: 'text',   default: '', hint: 'the account initiating the release'},
            {name: 'receiver',     type: 'text',   default: '', hint: 'must equal from OR to'},
            {name: 'escrow_id',    type: 'number', default: 0},
            {name: 'sbd_amount',   type: 'text',   default: '0.000 SBD'},
            {name: 'steem_amount', type: 'text',   default: '0.000 STEEM'}
        ],
        build: (v) => ['escrow_release', {
            from: v.from, to: v.to, agent: v.agent, who: v.who, receiver: v.receiver,
            escrow_id: Number(v.escrow_id),
            sbd_amount: v.sbd_amount, steem_amount: v.steem_amount
        }]
    })
})()
