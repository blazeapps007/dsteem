/* Output log — every BUILD / SIGNED / BROADCAST / LOOKUP / ERROR gets a timestamped, color-coded entry. */
(function () {
    'use strict'

    const outEl = document.getElementById('output')
    const clearBtn = document.getElementById('output-clear')

    function ts() {
        const d = new Date()
        const p = (n) => String(n).padStart(2, '0')
        return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
    }

    function safeStringify(value) {
        const seen = new WeakSet()
        return JSON.stringify(value, (k, v) => {
            if (typeof v === 'bigint') { return v.toString() + 'n' }
            if (v && typeof v === 'object') {
                if (seen.has(v)) { return '[Circular]' }
                seen.add(v)
                if (v.constructor && v.constructor.name === 'Buffer' && typeof v.toString === 'function') {
                    try { return '0x' + v.toString('hex') } catch (e) { /* fall through */ }
                }
                if (v.constructor && v.constructor.name === 'Uint8Array') {
                    return '0x' + Array.from(v).map((b) => b.toString(16).padStart(2, '0')).join('')
                }
            }
            return v
        }, 2)
    }

    function appendEntry(tag, title, payload, cssClass) {
        const entry = document.createElement('div')
        entry.className = 'log-entry ' + (cssClass || '')

        const head = document.createElement('div')
        const time = document.createElement('span')
        time.className = 'log-time'
        time.textContent = `[${ts()}]`
        const tagEl = document.createElement('span')
        tagEl.className = 'log-tag ' + tag
        tagEl.textContent = tag
        const titleEl = document.createElement('span')
        titleEl.style.marginLeft = '8px'
        titleEl.textContent = title || ''

        head.appendChild(time)
        head.appendChild(tagEl)
        head.appendChild(titleEl)
        entry.appendChild(head)

        if (payload !== undefined) {
            const pre = document.createElement('pre')
            if (typeof payload === 'string') {
                pre.textContent = payload
            } else {
                pre.textContent = safeStringify(payload)
            }
            entry.appendChild(pre)
        }

        outEl.appendChild(entry)
        outEl.scrollTop = outEl.scrollHeight
    }

    function errorPayload(err) {
        const out = {message: err && err.message ? err.message : String(err)}
        if (err && err.name) { out.name = err.name }
        if (err && err.data) { out.data = err.data }
        if (err && err.jse_info) { out.jse_info = err.jse_info }
        if (err && err.stack) { out.stack = err.stack }
        return out
    }

    clearBtn.addEventListener('click', () => { outEl.innerHTML = '' })

    window.dsteemLog = {
        build: (name, payload)   => appendEntry('BUILD',     name, payload, ''),
        signed: (name, payload)  => appendEntry('SIGNED',    name, payload, 'signed'),
        broadcast: (name, result)=> appendEntry('BROADCAST', name, result,  'success'),
        lookup: (name, payload)  => appendEntry('LOOKUP',    name, payload, 'lookup'),
        error: (name, err)       => appendEntry('ERROR',     name, errorPayload(err), 'error'),
        info: (msg)              => appendEntry('BUILD',     msg)
    }
})()
