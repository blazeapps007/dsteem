/* Form builder — registerOp({tab, name, auth, fields, build, broadcast, render}) creates a card in the right tab.
 * Two render paths:
 *   1. Schema path (fields[] + build()): generic input grid + Build & Sign + Broadcast buttons.
 *   2. Custom path (render(container, ctx)): the op file builds its own DOM. The ctx provides helpers + same submit semantics.
 */
(function () {
    'use strict'

    const TABS = ['account', 'content', 'wallet', 'power', 'market', 'escrow', 'witness', 'custom', 'governance', 'recovery']

    function getPanel(tabName) {
        const panel = document.querySelector(`.tab-panel[data-tab="${tabName}"]`)
        if (!panel) { throw new Error(`Unknown tab: ${tabName}`) }
        return panel
    }

    function el(tag, props, ...children) {
        const node = document.createElement(tag)
        if (props) {
            for (const k of Object.keys(props)) {
                if (k === 'class')      { node.className = props[k] }
                else if (k === 'style') { node.setAttribute('style', props[k]) }
                else if (k === 'html')  { node.innerHTML = props[k] }
                else if (k.startsWith('on')) { node.addEventListener(k.slice(2).toLowerCase(), props[k]) }
                else if (props[k] === true) { node.setAttribute(k, '') }
                else if (props[k] === false || props[k] == null) { /* skip */ }
                else { node.setAttribute(k, props[k]) }
            }
        }
        for (const c of children) {
            if (c == null) { continue }
            if (typeof c === 'string') { node.appendChild(document.createTextNode(c)) }
            else { node.appendChild(c) }
        }
        return node
    }

    function renderField(field) {
        const id = `f-${Math.random().toString(36).slice(2, 9)}`
        const label = el('label', {class: 'op-field-label', for: id}, field.name)
        let input
        const defaultValue = field.default == null ? '' : String(field.default)
        switch (field.type) {
            case 'textarea':
                input = el('textarea', {id, class: 'mono', rows: field.rows || 3}, defaultValue)
                break
            case 'number':
                input = el('input', {id, type: 'number', value: defaultValue, step: field.step || '1'})
                break
            case 'checkbox':
                input = el('input', {id, type: 'checkbox'})
                if (field.default) { input.checked = true }
                break
            case 'datetime-local':
                input = el('input', {id, type: 'datetime-local', value: defaultValue})
                break
            case 'select':
                input = el('select', {id})
                for (const opt of (field.options || [])) {
                    const o = el('option', {value: opt.value}, opt.label || opt.value)
                    if (opt.value === field.default) { o.setAttribute('selected', '') }
                    input.appendChild(o)
                }
                break
            default:
                input = el('input', {id, type: field.type || 'text', class: 'mono', value: defaultValue, placeholder: field.placeholder || ''})
        }
        const wrap = el('div', {class: 'op-field'}, label, input)
        if (field.hint) { wrap.appendChild(el('span', {class: 'op-field-hint'}, field.hint)) }
        wrap._read = () => {
            if (field.type === 'checkbox') { return input.checked }
            if (field.type === 'number')   { return input.value === '' ? 0 : Number(input.value) }
            return input.value
        }
        wrap._write = (v) => {
            if (field.type === 'checkbox') { input.checked = !!v }
            else { input.value = (v == null ? '' : String(v)) }
        }
        return wrap
    }

    function coerceValues(fields, rawValues) {
        // For simple ops, the build() callback gets the raw object as typed by the user.
        // Special coercions (int parsing for fields named like *_id, *_num) happen in op-file build() impls.
        return rawValues
    }

    function buildSubmitRow(opName, doBuild, doBroadcast) {
        const cb = el('input', {type: 'checkbox'})
        const cbLabel = el('label', null, cb, 'Broadcast')
        const buildBtn = el('button', {class: 'btn', type: 'button'}, 'Build & Sign')
        const bcBtn = el('button', {class: 'btn btn-broadcast', type: 'button', disabled: true}, 'Broadcast')

        function syncBroadcastBtn() {
            const enabled = cb.checked && window.dsteemApp && window.dsteemApp.canSign()
            bcBtn.disabled = !enabled
            if (window.dsteemApp && window.dsteemApp.isMainnet()) {
                bcBtn.classList.add('mainnet')
            } else {
                bcBtn.classList.remove('mainnet')
            }
        }

        cb.addEventListener('change', syncBroadcastBtn)
        document.addEventListener('dsteem:state-change', syncBroadcastBtn)
        // Apply the global default mode toggle: if set to "broadcast", auto-check the per-op checkbox.
        document.addEventListener('dsteem:default-mode', (e) => {
            cb.checked = (e.detail === 'broadcast')
            syncBroadcastBtn()
        })

        buildBtn.addEventListener('click', async () => {
            try { await doBuild() }
            catch (e) { window.dsteemLog.error(opName + ' build failed', e) }
        })
        bcBtn.addEventListener('click', async () => {
            if (!window.dsteemApp || !window.dsteemApp.canSign()) {
                window.dsteemLog.error(opName, new Error('No key — paste a WIF or fill in login/password first'))
                return
            }
            try { await doBroadcast() }
            catch (e) { window.dsteemLog.error(opName + ' broadcast failed', e) }
        })

        // Initial sync after DOM is wired
        setTimeout(syncBroadcastBtn, 0)

        return el('div', {class: 'op-actions'}, cbLabel, buildBtn, bcBtn)
    }

    /**
     * Build a Transaction object from a single operation, sign it with the current key, and log it.
     * Mirrors the ref-block / expiration computation from BroadcastAPI.sendOperations exactly.
     */
    async function buildAndSign(operation) {
        const app = window.dsteemApp
        if (!app) { throw new Error('App not ready') }
        const client = app.getClient()
        const key = app.getKey()
        if (!key) { throw new Error('No key — paste a WIF or fill in login/password first') }

        const props = await client.database.getDynamicGlobalProperties()
        const ref_block_num = props.head_block_number & 0xFFFF
        // Browser bundle polyfills Buffer; same call as src/helpers/broadcast.ts:284.
        const ref_block_prefix = Buffer.from(props.head_block_id, 'hex').readUInt32LE(4)
        const expiration = new Date(new Date(props.time + 'Z').getTime() + 60 * 1000).toISOString().slice(0, -5)

        const tx = {
            expiration,
            extensions: [],
            operations: [operation],
            ref_block_num,
            ref_block_prefix
        }

        return window.dsteem.cryptoUtils.signTransaction(tx, [key], client.chainId)
    }

    /**
     * registerOp — the main public API.
     */
    function registerOp(opSpec) {
        if (!TABS.includes(opSpec.tab)) { throw new Error(`Unknown tab: ${opSpec.tab}`) }
        const panel = getPanel(opSpec.tab)

        const card = el('div', {class: 'op-form', 'data-op': opSpec.name})
        const header = el('div', {class: 'op-form-header'},
            el('span', {class: 'op-name'}, opSpec.name),
            el('span', {class: 'op-auth ' + (opSpec.auth || 'any')}, '[' + (opSpec.auth || 'any') + ' key]')
        )
        card.appendChild(header)

        if (opSpec.description) {
            const desc = el('div', {class: 'muted', style: 'font-size:12px; margin-bottom:8px;'}, opSpec.description)
            card.appendChild(desc)
        }

        // Custom render path: the op file builds its own form. We provide a ctx with submit helpers.
        if (typeof opSpec.render === 'function') {
            const body = el('div')
            card.appendChild(body)
            const ctx = {
                el,
                buildAndSign,
                log: window.dsteemLog,
                addSubmitRow(getOperation, doBroadcast) {
                    async function doBuild() {
                        const op = getOperation()
                        window.dsteemLog.build(opSpec.name, op[1])
                        const signed = await buildAndSign(op)
                        window.dsteemLog.signed(opSpec.name, signed)
                    }
                    async function doBcast() {
                        const op = getOperation()
                        window.dsteemLog.build(opSpec.name, op[1])
                        const result = await (doBroadcast
                            ? doBroadcast(window.dsteemApp.getClient(), op[1], window.dsteemApp.getKey())
                            : window.dsteemApp.getClient().broadcast.sendOperations([op], window.dsteemApp.getKey()))
                        window.dsteemLog.broadcast(opSpec.name, result)
                    }
                    card.appendChild(buildSubmitRow(opSpec.name, doBuild, doBcast))
                }
            }
            opSpec.render(body, ctx)
            panel.appendChild(card)
            return
        }

        // Schema render path.
        const fieldsContainer = el('div', {class: 'op-fields'})
        const fieldNodes = {}
        for (const f of (opSpec.fields || [])) {
            const node = renderField(f)
            fieldsContainer.appendChild(node)
            fieldNodes[f.name] = node
        }
        card.appendChild(fieldsContainer)

        function readValues() {
            const out = {}
            for (const name of Object.keys(fieldNodes)) {
                out[name] = fieldNodes[name]._read()
            }
            return coerceValues(opSpec.fields, out)
        }

        async function doBuild() {
            const values = readValues()
            const op = opSpec.build(values)
            window.dsteemLog.build(opSpec.name, op[1])
            const signed = await buildAndSign(op)
            window.dsteemLog.signed(opSpec.name, signed)
        }

        async function doBcast() {
            const values = readValues()
            const op = opSpec.build(values)
            window.dsteemLog.build(opSpec.name, op[1])
            const client = window.dsteemApp.getClient()
            const key = window.dsteemApp.getKey()
            const result = await (opSpec.broadcast
                ? opSpec.broadcast(client, op[1], key)
                : client.broadcast.sendOperations([op], key))
            window.dsteemLog.broadcast(opSpec.name, result)
        }

        card.appendChild(buildSubmitRow(opSpec.name, doBuild, doBcast))
        panel.appendChild(card)
    }

    window.registerOp = registerOp
    window.dsteemForm = {el, buildAndSign}
})()
