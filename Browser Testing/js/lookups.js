/* Read-only lookups — populated into #lookups-panel. None of these require a key. */
(function () {
    'use strict'

    const panel = document.getElementById('lookups-panel')
    const {el} = window.dsteemForm

    function card(title, contents) {
        return el('div', {class: 'lookup-card'}, el('h4', null, title), ...contents)
    }

    function input(placeholder, value) {
        return el('input', {type: 'text', class: 'mono', placeholder, value: value || ''})
    }

    function btn(label, onClick) {
        return el('button', {class: 'btn-secondary', type: 'button', onclick: onClick}, label)
    }

    function client() {
        if (!window.dsteemApp) { throw new Error('App not ready') }
        return window.dsteemApp.getClient()
    }

    async function run(name, fn) {
        try {
            const result = await fn()
            window.dsteemLog.lookup(name, result)
        } catch (e) {
            window.dsteemLog.error('lookup: ' + name, e)
        }
    }

    // 1. getAccounts
    {
        const inp = input('account name')
        // Mirror the top-bar account name into the lookup field on focus, for convenience.
        inp.addEventListener('focus', () => {
            if (!inp.value) {
                const a = document.getElementById('account-input').value.trim()
                if (a) { inp.value = a }
            }
        })
        const go = btn('Lookup', () => {
            const acct = inp.value.trim()
            if (!acct) { window.dsteemLog.error('getAccounts', new Error('Account name required')); return }
            run('getAccounts(' + acct + ')', () => client().database.getAccounts([acct]))
        })
        panel.appendChild(card('getAccounts', [el('div', {class: 'lookup-row'}, inp, go)]))
    }

    // 2. getDynamicGlobalProperties (no input)
    {
        const go = btn('Fetch', () => run('getDynamicGlobalProperties', () => client().database.getDynamicGlobalProperties()))
        panel.appendChild(card('getDynamicGlobalProperties', [el('div', {class: 'lookup-row'}, go)]))
    }

    // 3. getChainProperties (no input)
    {
        const go = btn('Fetch', () => run('getChainProperties', () => client().database.getChainProperties()))
        panel.appendChild(card('getChainProperties', [el('div', {class: 'lookup-row'}, go)]))
    }

    // 4. getCurrentMedianHistoryPrice
    {
        const go = btn('Fetch', () => run('getCurrentMedianHistoryPrice', () => client().database.getCurrentMedianHistoryPrice()))
        panel.appendChild(card('getCurrentMedianHistoryPrice', [el('div', {class: 'lookup-row'}, go)]))
    }

    // 5. getRCMana
    {
        const inp = input('account name')
        const go = btn('Fetch', () => {
            const acct = inp.value.trim()
            if (!acct) { window.dsteemLog.error('getRCMana', new Error('Account name required')); return }
            run('getRCMana(' + acct + ')', () => client().rc.getRCMana(acct))
        })
        panel.appendChild(card('getRCMana', [el('div', {class: 'lookup-row'}, inp, go)]))
    }

    // 6. getVPMana
    {
        const inp = input('account name')
        const go = btn('Fetch', () => {
            const acct = inp.value.trim()
            if (!acct) { window.dsteemLog.error('getVPMana', new Error('Account name required')); return }
            run('getVPMana(' + acct + ')', () => client().rc.getVPMana(acct))
        })
        panel.appendChild(card('getVPMana', [el('div', {class: 'lookup-row'}, inp, go)]))
    }

    // 7. getBlock
    {
        const inp = el('input', {type: 'number', placeholder: 'block number'})
        const go = btn('Fetch', () => {
            const n = Number(inp.value)
            if (!Number.isFinite(n) || n <= 0) { window.dsteemLog.error('getBlock', new Error('Valid block number required')); return }
            run('getBlock(' + n + ')', () => client().database.getBlock(n))
        })
        panel.appendChild(card('getBlock', [el('div', {class: 'lookup-row'}, inp, go)]))
    }

    // 8. getDiscussions
    {
        const cat = el('select', null,
            ...['trending', 'created', 'active', 'hot', 'cashout', 'promoted', 'blog', 'feed', 'comments', 'votes', 'children']
                .map((c) => el('option', {value: c}, c))
        )
        const tag = input('tag', '')
        const lim = el('input', {type: 'number', placeholder: 'limit', value: '5'})
        const go = btn('Fetch', () => {
            const query = {tag: tag.value.trim() || '', limit: Math.max(1, Math.min(100, Number(lim.value) || 5))}
            run('getDiscussions(' + cat.value + ', ' + JSON.stringify(query) + ')',
                () => client().database.getDiscussions(cat.value, query))
        })
        panel.appendChild(card('getDiscussions', [
            el('div', {class: 'lookup-row'}, cat),
            el('div', {class: 'lookup-row', style: 'margin-top:4px;'}, tag, lim, go)
        ]))
    }

    // 9. getConfig
    {
        const go = btn('Fetch', () => run('getConfig', () => client().database.getConfig()))
        panel.appendChild(card('getConfig', [el('div', {class: 'lookup-row'}, go)]))
    }

    // 10. Custom RPC call — escape hatch for anything else.
    {
        const api = input('api', 'condenser_api')
        const method = input('method', 'get_accounts')
        const params = el('textarea', {class: 'mono', placeholder: '["blaze.apps"]', rows: 2}, '[]')
        const go = btn('Call', () => {
            let parsed
            try { parsed = JSON.parse(params.value || '[]') }
            catch (e) { window.dsteemLog.error('client.call', new Error('Invalid JSON in params')); return }
            run(`client.call(${api.value}, ${method.value})`,
                () => client().call(api.value.trim(), method.value.trim(), parsed))
        })
        panel.appendChild(card('client.call (raw RPC)', [
            el('div', {class: 'lookup-row'}, api, method),
            el('div', {class: 'lookup-row', style: 'margin-top:4px;'}, params),
            el('div', {class: 'lookup-row', style: 'margin-top:4px;'}, go)
        ]))
    }
})()
