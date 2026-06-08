/* Content operations: comment, comment_options, delete_comment, vote */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }

    registerOp({
        tab: 'content', name: 'vote', auth: 'posting',
        fields: [
            {name: 'voter',    type: 'text', default: ''},
            {name: 'author',   type: 'text', default: ''},
            {name: 'permlink', type: 'text', default: ''},
            {name: 'weight',   type: 'number', default: 10000, hint: '100% = 10000 (range -10000 .. 10000)'}
        ],
        build: (v) => ['vote', {voter: v.voter, author: v.author, permlink: v.permlink, weight: Number(v.weight)}],
        broadcast: (c, v, k) => c.broadcast.vote(v, k)
    })

    registerOp({
        tab: 'content', name: 'comment', auth: 'posting',
        description: 'Post a new comment OR reply (set parent_author="" for a new root post, set parent_permlink to the main tag).',
        fields: [
            {name: 'parent_author',   type: 'text', default: '', hint: 'empty for a root post'},
            {name: 'parent_permlink', type: 'text', default: 'test', hint: 'main tag if root post'},
            {name: 'author',          type: 'text', default: ''},
            {name: 'permlink',        type: 'text', default: 'test-' + Date.now()},
            {name: 'title',           type: 'text', default: 'Test post from dsteem harness'},
            {name: 'body',            type: 'textarea', default: 'Hello from the dsteem browser testing harness.'},
            {name: 'json_metadata',   type: 'textarea', default: '{"app":"dsteem-browser-testing","tags":["test"]}', hint: 'JSON string'}
        ],
        build: (v) => ['comment', v],
        broadcast: (c, v, k) => c.broadcast.comment(v, k)
    })

    registerOp({
        tab: 'content', name: 'delete_comment', auth: 'posting',
        fields: [
            {name: 'author',   type: 'text', default: ''},
            {name: 'permlink', type: 'text', default: ''}
        ],
        build: (v) => ['delete_comment', v]
    })

    // comment_options needs a beneficiaries list — custom render
    registerOp({
        tab: 'content', name: 'comment_options', auth: 'posting',
        description: 'Set payout options on an existing comment. Beneficiaries weights sum must be ≤ 10000.',
        render(container, ctx) {
            const el = ctx.el
            const author = el('input', {type: 'text', class: 'mono', placeholder: 'author'})
            const permlink = el('input', {type: 'text', class: 'mono', placeholder: 'permlink'})
            const maxPayout = el('input', {type: 'text', class: 'mono', value: '1000000.000 SBD'})
            const pctSbd = el('input', {type: 'number', value: '10000'})
            const allowVotes = el('input', {type: 'checkbox'}); allowVotes.checked = true
            const allowCuration = el('input', {type: 'checkbox'}); allowCuration.checked = true

            function field(label, input, hint) {
                return el('div', {class: 'op-field'},
                    el('label', {class: 'op-field-label'}, label),
                    input,
                    hint ? el('span', {class: 'op-field-hint'}, hint) : null
                )
            }

            const beneList = el('div', {class: 'row-list'})
            function addBeneRow(acct, weight) {
                const a = el('input', {type: 'text', class: 'mono', placeholder: 'account', value: acct || ''})
                const w = el('input', {type: 'number', placeholder: 'weight (0–10000)', value: weight == null ? '' : String(weight)})
                const rm = el('button', {class: 'btn-tiny', type: 'button'}, '×')
                const row = el('div', {class: 'row-item'}, a, w, rm)
                rm.addEventListener('click', () => row.remove())
                beneList.appendChild(row)
            }
            const addBtn = el('button', {class: 'btn-secondary', type: 'button'}, '+ beneficiary')
            addBtn.addEventListener('click', () => addBeneRow('', ''))

            const beneGroup = el('div', {class: 'subgroup'},
                el('div', {class: 'subgroup-title'}, 'beneficiaries (sorted by account name on submit)'),
                beneList,
                addBtn
            )

            container.appendChild(el('div', {class: 'op-fields'},
                field('author', author),
                field('permlink', permlink),
                field('max_accepted_payout', maxPayout, 'e.g. "1000000.000 SBD"'),
                field('percent_steem_dollars', pctSbd, '0–10000 (10000 = 100%)'),
                field('allow_votes', allowVotes),
                field('allow_curation_rewards', allowCuration),
                beneGroup
            ))

            function readBeneficiaries() {
                const rows = beneList.querySelectorAll('.row-item')
                const out = []
                rows.forEach((r) => {
                    const inputs = r.querySelectorAll('input')
                    const acct = inputs[0].value.trim()
                    const wt = Number(inputs[1].value)
                    if (acct) { out.push({account: acct, weight: wt}) }
                })
                // Steem requires beneficiaries sorted by account
                out.sort((a, b) => a.account < b.account ? -1 : a.account > b.account ? 1 : 0)
                return out
            }

            function buildOp() {
                const beneficiaries = readBeneficiaries()
                const extensions = beneficiaries.length > 0 ? [[0, {beneficiaries}]] : []
                return ['comment_options', {
                    author: author.value.trim(),
                    permlink: permlink.value.trim(),
                    max_accepted_payout: maxPayout.value.trim(),
                    percent_steem_dollars: Number(pctSbd.value),
                    allow_votes: allowVotes.checked,
                    allow_curation_rewards: allowCuration.checked,
                    extensions
                }]
            }

            ctx.addSubmitRow(buildOp)
        }
    })
})()
