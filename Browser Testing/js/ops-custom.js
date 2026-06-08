/* Custom ops: custom_json, custom_binary, custom */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }

    function parseList(s) {
        return s.split(',').map((x) => x.trim()).filter(Boolean)
    }

    registerOp({
        tab: 'custom', name: 'custom_json', auth: 'posting',
        description: 'Most apps (Splinterlands, dApps, app-level events) use this. required_auths uses active key; required_posting_auths uses posting key.',
        fields: [
            {name: 'required_auths',         type: 'text',     default: '', hint: 'comma-separated account names (active-key signers)'},
            {name: 'required_posting_auths', type: 'text',     default: '', hint: 'comma-separated account names (posting-key signers)'},
            {name: 'id',                     type: 'text',     default: 'dsteem-harness-test', hint: '≤ 32 chars'},
            {name: 'json',                   type: 'textarea', default: '{"event":"hello","ts":' + Date.now() + '}', hint: 'must be valid JSON'}
        ],
        build: (v) => {
            const json = (v.json || '').trim()
            try { JSON.parse(json) } catch (e) { throw new Error('json field must be valid JSON: ' + e.message) }
            return ['custom_json', {
                required_auths: parseList(v.required_auths),
                required_posting_auths: parseList(v.required_posting_auths),
                id: v.id,
                json
            }]
        },
        broadcast: (c, v, k) => c.broadcast.json(v, k)
    })

    registerOp({
        tab: 'custom', name: 'custom_binary', auth: 'active',
        description: 'Binary custom op. data is a hex-encoded buffer.',
        fields: [
            {name: 'required_owner_auths',   type: 'text', default: ''},
            {name: 'required_active_auths',  type: 'text', default: ''},
            {name: 'required_posting_auths', type: 'text', default: ''},
            {name: 'required_auths',         type: 'textarea', default: '[]', hint: 'JSON array of AuthorityType — usually []'},
            {name: 'id',                     type: 'text', default: 'dsteem-test', hint: '≤ 32 chars'},
            {name: 'data',                   type: 'text', default: 'deadbeef', hint: 'hex string'}
        ],
        build: (v) => {
            let requiredAuths
            try { requiredAuths = JSON.parse(v.required_auths || '[]') }
            catch (e) { throw new Error('required_auths must be JSON: ' + e.message) }
            const hex = (v.data || '').replace(/^0x/i, '')
            const data = Buffer.from(hex, 'hex')
            return ['custom_binary', {
                required_owner_auths: parseList(v.required_owner_auths),
                required_active_auths: parseList(v.required_active_auths),
                required_posting_auths: parseList(v.required_posting_auths),
                required_auths: requiredAuths,
                id: v.id,
                data
            }]
        }
    })

    registerOp({
        tab: 'custom', name: 'custom', auth: 'active',
        description: 'Legacy custom op with a numeric id. data is hex.',
        fields: [
            {name: 'required_auths', type: 'text',   default: '', hint: 'comma-separated account names'},
            {name: 'id',             type: 'number', default: 0, hint: 'uint16'},
            {name: 'data',           type: 'text',   default: 'deadbeef', hint: 'hex string'}
        ],
        build: (v) => {
            const hex = (v.data || '').replace(/^0x/i, '')
            return ['custom', {
                required_auths: parseList(v.required_auths),
                id: Number(v.id),
                data: Buffer.from(hex, 'hex')
            }]
        }
    })
})()
