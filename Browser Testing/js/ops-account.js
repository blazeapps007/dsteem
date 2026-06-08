/* Account ops: account_create, account_create_with_delegation, create_claimed_account, claim_account, account_update, account_update2, change_recovery_account
 *
 * Account-creation ops share an authority-block widget that supports:
 *   - manual entry of weight_threshold + key_auths + account_auths
 *   - "derive from password" helper that fills owner/active/posting/memo from PrivateKey.fromLogin
 */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }
    const el = window.dsteemForm.el

    /* AuthorityType widget — exposed via _read() returning {weight_threshold, account_auths, key_auths}. */
    function authorityWidget(label, defaultThreshold) {
        const wt = el('input', {type: 'number', value: String(defaultThreshold || 1)})
        const keyList = el('div', {class: 'row-list'})
        const acctList = el('div', {class: 'row-list'})

        function addKeyRow(k, w) {
            const kI = el('input', {type: 'text', class: 'mono', placeholder: 'STM... pubkey', value: k || ''})
            const wI = el('input', {type: 'number', placeholder: 'weight', value: w == null ? '1' : String(w)})
            const rm = el('button', {class: 'btn-tiny', type: 'button'}, '×')
            const row = el('div', {class: 'row-item'}, kI, wI, rm)
            rm.addEventListener('click', () => row.remove())
            keyList.appendChild(row)
        }
        function addAcctRow(a, w) {
            const aI = el('input', {type: 'text', class: 'mono', placeholder: 'account', value: a || ''})
            const wI = el('input', {type: 'number', placeholder: 'weight', value: w == null ? '1' : String(w)})
            const rm = el('button', {class: 'btn-tiny', type: 'button'}, '×')
            const row = el('div', {class: 'row-item'}, aI, wI, rm)
            rm.addEventListener('click', () => row.remove())
            acctList.appendChild(row)
        }
        const addKeyBtn = el('button', {class: 'btn-tiny', type: 'button'}, '+ key_auth')
        addKeyBtn.addEventListener('click', () => addKeyRow('', 1))
        const addAcctBtn = el('button', {class: 'btn-tiny', type: 'button'}, '+ account_auth')
        addAcctBtn.addEventListener('click', () => addAcctRow('', 1))
        addKeyRow('', 1)

        const wrap = el('div', {class: 'subgroup'},
            el('div', {class: 'subgroup-title'}, label + ' (AuthorityType)'),
            el('div', {class: 'op-fields'},
                el('div', {class: 'op-field'}, el('label', {class: 'op-field-label'}, 'weight_threshold'), wt)
            ),
            el('div', {class: 'subgroup-title', style: 'margin-top:6px'}, 'key_auths'),
            keyList,
            addKeyBtn,
            el('div', {class: 'subgroup-title', style: 'margin-top:6px'}, 'account_auths'),
            acctList,
            addAcctBtn
        )

        wrap._read = () => {
            const key_auths = []
            keyList.querySelectorAll('.row-item').forEach((r) => {
                const inp = r.querySelectorAll('input')
                const k = inp[0].value.trim()
                if (k) { key_auths.push([k, Number(inp[1].value) || 1]) }
            })
            key_auths.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
            const account_auths = []
            acctList.querySelectorAll('.row-item').forEach((r) => {
                const inp = r.querySelectorAll('input')
                const a = inp[0].value.trim()
                if (a) { account_auths.push([a, Number(inp[1].value) || 1]) }
            })
            account_auths.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)
            return {
                weight_threshold: Number(wt.value) || 1,
                account_auths,
                key_auths
            }
        }
        wrap._setKey = (pubkey) => {
            keyList.innerHTML = ''
            addKeyRow(pubkey, 1)
        }
        return wrap
    }

    /* Password-derive helper: fills all four authority widgets from PrivateKey.fromLogin. */
    function derivePanel(username, password, ownerW, activeW, postingW, memoKeyInput) {
        const prefix = (window.dsteemApp && window.dsteemApp.getClient && window.dsteemApp.getClient().addressPrefix) || 'STM'
        const owner = window.dsteem.PrivateKey.fromLogin(username, password, 'owner').createPublic(prefix).toString()
        const active = window.dsteem.PrivateKey.fromLogin(username, password, 'active').createPublic(prefix).toString()
        const posting = window.dsteem.PrivateKey.fromLogin(username, password, 'posting').createPublic(prefix).toString()
        const memo = window.dsteem.PrivateKey.fromLogin(username, password, 'memo').createPublic(prefix).toString()
        ownerW._setKey(owner)
        activeW._setKey(active)
        postingW._setKey(posting)
        memoKeyInput.value = memo
    }

    function createAccountForm(opName, withDelegation) {
        return {
            tab: 'account', name: opName, auth: 'active',
            description: 'Pre-2018 account creation (charges fee, no claim_account/create_claimed_account split). Most networks now use claim_account + create_claimed_account instead.',
            render(container, ctx) {
                const fee = el('input', {type: 'text', class: 'mono', value: '3.000 STEEM'})
                const delegation = withDelegation ? el('input', {type: 'text', class: 'mono', value: '0.000000 VESTS'}) : null
                const creator = el('input', {type: 'text', class: 'mono'})
                const newName = el('input', {type: 'text', class: 'mono', placeholder: 'new-account-name'})
                const memoKey = el('input', {type: 'text', class: 'mono', placeholder: 'STM... memo pubkey'})
                const meta = el('textarea', {class: 'mono', rows: 2}, '{}')

                const ownerW = authorityWidget('owner', 1)
                const activeW = authorityWidget('active', 1)
                const postingW = authorityWidget('posting', 1)

                // Password derivation helper
                const dUser = el('input', {type: 'text', class: 'mono', placeholder: 'new account username'})
                const dPass = el('input', {type: 'password', class: 'mono', placeholder: 'new account password'})
                const dBtn = el('button', {class: 'btn-secondary', type: 'button'}, 'Derive all 4 keys')
                dBtn.addEventListener('click', () => {
                    try {
                        const u = dUser.value.trim() || newName.value.trim()
                        if (!u || !dPass.value) { throw new Error('Need username + password') }
                        derivePanel(u, dPass.value, ownerW, activeW, postingW, memoKey)
                        if (!newName.value.trim()) { newName.value = u }
                        ctx.log.info('Derived owner/active/posting/memo public keys from password')
                    } catch (e) { ctx.log.error('derive', e) }
                })

                function f(label, input) {
                    return el('div', {class: 'op-field'}, el('label', {class: 'op-field-label'}, label), input)
                }

                container.appendChild(el('div', {class: 'op-fields'},
                    f('fee', fee),
                    delegation ? f('delegation', delegation) : null,
                    f('creator', creator),
                    f('new_account_name', newName),
                    el('div', {class: 'subgroup'},
                        el('div', {class: 'subgroup-title'}, 'Derive authorities from password (optional helper)'),
                        el('div', {class: 'row-list'},
                            el('div', {class: 'row-item'}, dUser, dPass, dBtn)
                        )
                    ),
                    ownerW,
                    activeW,
                    postingW,
                    f('memo_key', memoKey),
                    f('json_metadata', meta)
                ))

                ctx.addSubmitRow(() => {
                    const body = {
                        fee: fee.value.trim(),
                        creator: creator.value.trim(),
                        new_account_name: newName.value.trim(),
                        owner: ownerW._read(),
                        active: activeW._read(),
                        posting: postingW._read(),
                        memo_key: memoKey.value.trim(),
                        json_metadata: meta.value
                    }
                    if (withDelegation) {
                        body.delegation = delegation.value.trim()
                        body.extensions = []
                    }
                    return [opName, body]
                })
            }
        }
    }

    registerOp(createAccountForm('account_create', false))
    registerOp(createAccountForm('account_create_with_delegation', true))

    // create_claimed_account — same shape as account_create but without fee, with extensions
    registerOp({
        tab: 'account', name: 'create_claimed_account', auth: 'active',
        description: 'Modern account creation. Pair with a prior claim_account op (or use an existing pending claim).',
        render(container, ctx) {
            const creator = el('input', {type: 'text', class: 'mono'})
            const newName = el('input', {type: 'text', class: 'mono'})
            const memoKey = el('input', {type: 'text', class: 'mono'})
            const meta = el('textarea', {class: 'mono', rows: 2}, '{}')
            const ownerW = authorityWidget('owner', 1)
            const activeW = authorityWidget('active', 1)
            const postingW = authorityWidget('posting', 1)

            const dUser = el('input', {type: 'text', class: 'mono', placeholder: 'new account username'})
            const dPass = el('input', {type: 'password', class: 'mono', placeholder: 'new account password'})
            const dBtn = el('button', {class: 'btn-secondary', type: 'button'}, 'Derive all 4 keys')
            dBtn.addEventListener('click', () => {
                try {
                    const u = dUser.value.trim() || newName.value.trim()
                    if (!u || !dPass.value) { throw new Error('Need username + password') }
                    derivePanel(u, dPass.value, ownerW, activeW, postingW, memoKey)
                    if (!newName.value.trim()) { newName.value = u }
                } catch (e) { ctx.log.error('derive', e) }
            })

            function f(label, input) {
                return el('div', {class: 'op-field'}, el('label', {class: 'op-field-label'}, label), input)
            }

            container.appendChild(el('div', {class: 'op-fields'},
                f('creator', creator),
                f('new_account_name', newName),
                el('div', {class: 'subgroup'},
                    el('div', {class: 'subgroup-title'}, 'Derive authorities from password (optional helper)'),
                    el('div', {class: 'row-list'},
                        el('div', {class: 'row-item'}, dUser, dPass, dBtn)
                    )
                ),
                ownerW, activeW, postingW,
                f('memo_key', memoKey),
                f('json_metadata', meta)
            ))

            ctx.addSubmitRow(() => ['create_claimed_account', {
                creator: creator.value.trim(),
                new_account_name: newName.value.trim(),
                owner: ownerW._read(),
                active: activeW._read(),
                posting: postingW._read(),
                memo_key: memoKey.value.trim(),
                json_metadata: meta.value,
                extensions: []
            }])
        }
    })

    registerOp({
        tab: 'account', name: 'claim_account', auth: 'active',
        description: 'Spend RCs (or a fee) to claim the right to create one account later via create_claimed_account.',
        fields: [
            {name: 'creator', type: 'text', default: ''},
            {name: 'fee',     type: 'text', default: '0.000 STEEM', hint: '0.000 STEEM = spend RCs only; positive = pay creation fee'}
        ],
        build: (v) => ['claim_account', {creator: v.creator, fee: v.fee, extensions: []}]
    })

    function accountUpdateForm(opName, isV2) {
        return {
            tab: 'account', name: opName, auth: 'owner',
            description: 'Updates require OWNER key to change owner/active; ACTIVE is enough for posting/memo_key/json_metadata. Authority fields are OPTIONAL — leave a block empty to keep current.',
            render(container, ctx) {
                const account = el('input', {type: 'text', class: 'mono'})
                const memoKey = el('input', {type: 'text', class: 'mono', placeholder: 'optional — leave empty to keep'})
                const meta = el('textarea', {class: 'mono', rows: 2}, '')
                const postingMeta = isV2 ? el('textarea', {class: 'mono', rows: 2}, '') : null

                const enOwner = el('input', {type: 'checkbox'})
                const enActive = el('input', {type: 'checkbox'})
                const enPosting = el('input', {type: 'checkbox'})

                const ownerW = authorityWidget('owner', 1)
                const activeW = authorityWidget('active', 1)
                const postingW = authorityWidget('posting', 1)

                function toggleAuth(cb, widget) {
                    widget.style.opacity = cb.checked ? '1' : '0.4'
                    widget.style.pointerEvents = cb.checked ? 'auto' : 'none'
                }
                ;[[enOwner, ownerW], [enActive, activeW], [enPosting, postingW]].forEach(([cb, w]) => {
                    toggleAuth(cb, w)
                    cb.addEventListener('change', () => toggleAuth(cb, w))
                })

                function f(label, input, hint) {
                    return el('div', {class: 'op-field'},
                        el('label', {class: 'op-field-label'}, label), input,
                        hint ? el('span', {class: 'op-field-hint'}, hint) : null
                    )
                }

                container.appendChild(el('div', {class: 'op-fields'},
                    f('account', account),
                    el('div', {class: 'op-field'},
                        el('label', null, enOwner, ' set owner authority')
                    ),
                    ownerW,
                    el('div', {class: 'op-field'},
                        el('label', null, enActive, ' set active authority')
                    ),
                    activeW,
                    el('div', {class: 'op-field'},
                        el('label', null, enPosting, ' set posting authority')
                    ),
                    postingW,
                    f('memo_key', memoKey, isV2 ? 'optional in v2' : 'required by v1'),
                    f('json_metadata', meta),
                    isV2 ? f('posting_json_metadata', postingMeta) : null
                ))

                ctx.addSubmitRow(() => {
                    const body = {account: account.value.trim(), json_metadata: meta.value}
                    if (enOwner.checked)   { body.owner   = ownerW._read() }
                    if (enActive.checked)  { body.active  = activeW._read() }
                    if (enPosting.checked) { body.posting = postingW._read() }
                    const mk = memoKey.value.trim()
                    if (isV2) {
                        if (mk) { body.memo_key = mk }
                        body.posting_json_metadata = postingMeta.value
                        body.extensions = []
                    } else {
                        // v1 requires memo_key
                        body.memo_key = mk
                    }
                    return [opName, body]
                })
            }
        }
    }

    registerOp(accountUpdateForm('account_update', false))
    registerOp(accountUpdateForm('account_update2', true))

    registerOp({
        tab: 'account', name: 'change_recovery_account', auth: 'owner',
        description: 'Schedule a recovery-account change. Takes effect after a 30-day delay (anti-takeover window).',
        fields: [
            {name: 'account_to_recover',   type: 'text', default: ''},
            {name: 'new_recovery_account', type: 'text', default: ''}
        ],
        build: (v) => ['change_recovery_account', {
            account_to_recover: v.account_to_recover,
            new_recovery_account: v.new_recovery_account,
            extensions: []
        }]
    })

    // Export the authority widget so ops-recovery.js can reuse it.
    window.dsteemAuthWidget = authorityWidget
})()
