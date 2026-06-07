/* Recovery + legacy ops: request_account_recovery, recover_account, reset_account, set_reset_account, pow, pow2, report_over_production */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }
    const el = window.dsteemForm.el
    const authorityWidget = window.dsteemAuthWidget // exported by ops-account.js

    registerOp({
        tab: 'recovery', name: 'request_account_recovery', auth: 'active',
        description: 'Signed by the listed recovery_account. Posts a new owner authority the account holder can then confirm with recover_account within 24h.',
        render(container, ctx) {
            const recoveryAcct = el('input', {type: 'text', class: 'mono'})
            const acctToRecover = el('input', {type: 'text', class: 'mono'})
            const newOwner = authorityWidget('new_owner_authority', 1)

            function f(label, input) {
                return el('div', {class: 'op-field'}, el('label', {class: 'op-field-label'}, label), input)
            }
            container.appendChild(el('div', {class: 'op-fields'},
                f('recovery_account', recoveryAcct),
                f('account_to_recover', acctToRecover),
                newOwner
            ))
            ctx.addSubmitRow(() => ['request_account_recovery', {
                recovery_account: recoveryAcct.value.trim(),
                account_to_recover: acctToRecover.value.trim(),
                new_owner_authority: newOwner._read(),
                extensions: []
            }])
        }
    })

    registerOp({
        tab: 'recovery', name: 'recover_account', auth: 'owner',
        description: 'Signed with keys satisfying BOTH the new owner authority AND a "recent owner authority" valid within the past 30 days.',
        render(container, ctx) {
            const acctToRecover = el('input', {type: 'text', class: 'mono'})
            const newOwner = authorityWidget('new_owner_authority', 1)
            const recent = authorityWidget('recent_owner_authority', 1)

            function f(label, input) {
                return el('div', {class: 'op-field'}, el('label', {class: 'op-field-label'}, label), input)
            }
            container.appendChild(el('div', {class: 'op-fields'},
                f('account_to_recover', acctToRecover),
                newOwner,
                recent
            ))
            ctx.addSubmitRow(() => ['recover_account', {
                account_to_recover: acctToRecover.value.trim(),
                new_owner_authority: newOwner._read(),
                recent_owner_authority: recent._read(),
                extensions: []
            }])
        }
    })

    registerOp({
        tab: 'recovery', name: 'reset_account', auth: 'owner',
        description: 'Used by the reset_account to forcibly set a new owner authority after 60 days of inactivity.',
        render(container, ctx) {
            const resetAcct = el('input', {type: 'text', class: 'mono'})
            const acctToReset = el('input', {type: 'text', class: 'mono'})
            const newOwner = authorityWidget('new_owner_authority', 1)

            function f(label, input) {
                return el('div', {class: 'op-field'}, el('label', {class: 'op-field-label'}, label), input)
            }
            container.appendChild(el('div', {class: 'op-fields'},
                f('reset_account', resetAcct),
                f('account_to_reset', acctToReset),
                newOwner
            ))
            ctx.addSubmitRow(() => ['reset_account', {
                reset_account: resetAcct.value.trim(),
                account_to_reset: acctToReset.value.trim(),
                new_owner_authority: newOwner._read()
            }])
        }
    })

    registerOp({
        tab: 'recovery', name: 'set_reset_account', auth: 'owner',
        description: 'Owner sets/changes which account can reset_account them after 60 days inactive.',
        fields: [
            {name: 'account',               type: 'text', default: ''},
            {name: 'current_reset_account', type: 'text', default: ''},
            {name: 'reset_account',         type: 'text', default: ''}
        ],
        build: (v) => ['set_reset_account', v]
    })

    /* --- Legacy ops (kept for serializer coverage; almost no one constructs these by hand) --- */

    registerOp({
        tab: 'recovery', name: 'pow', auth: 'any',
        description: 'Legacy proof-of-work mining op. Not used on modern Steem. Schema is opaque — paste a fully-formed object as JSON.',
        fields: [
            {name: 'op_json', type: 'textarea', default: '{\n  "worker_account": "",\n  "block_id": "",\n  "nonce": 0,\n  "work": {},\n  "props": {}\n}', rows: 8, hint: 'JSON object matching PowOperation[1]'}
        ],
        build: (v) => {
            const body = JSON.parse(v.op_json)
            return ['pow', body]
        }
    })

    registerOp({
        tab: 'recovery', name: 'pow2', auth: 'any',
        description: 'Legacy equihash proof-of-work op. Same caveats as pow.',
        fields: [
            {name: 'op_json', type: 'textarea', default: '{\n  "work": {},\n  "new_owner_key": null,\n  "props": {}\n}', rows: 8, hint: 'JSON object matching Pow2Operation[1]'}
        ],
        build: (v) => ['pow2', JSON.parse(v.op_json)]
    })

    registerOp({
        tab: 'recovery', name: 'report_over_production', auth: 'any',
        description: 'Report a witness that signed two blocks at the same time. first_block / second_block are full SignedBlockHeader objects.',
        fields: [
            {name: 'reporter',     type: 'text',     default: ''},
            {name: 'first_block',  type: 'textarea', default: '{}', rows: 6, hint: 'SignedBlockHeader JSON'},
            {name: 'second_block', type: 'textarea', default: '{}', rows: 6, hint: 'SignedBlockHeader JSON'}
        ],
        build: (v) => ['report_over_production', {
            reporter: v.reporter,
            first_block: JSON.parse(v.first_block),
            second_block: JSON.parse(v.second_block)
        }]
    })
})()
