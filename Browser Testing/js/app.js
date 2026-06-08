/* App bootstrap — wires the top bar to a shared Client + key state.
 * Loaded LAST so all js/ops-*.js have already called registerOp().
 */
(function () {
    'use strict'

    const bundleErrorEl = document.getElementById('bundle-error')
    if (typeof window.dsteem === 'undefined') {
        bundleErrorEl.hidden = false
        // Still wire the basic UI so the user gets a sane page.
    }

    // ---------- Version banner ----------
    const versionEl = document.getElementById('bundle-version')
    if (window.dsteem && window.dsteem.VERSION) {
        versionEl.textContent = 'v' + window.dsteem.VERSION
    }

    // ---------- Tabs ----------
    const tabBtns = Array.from(document.querySelectorAll('.tab'))
    const tabPanels = Array.from(document.querySelectorAll('.tab-panel'))
    tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.tab
            tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === name))
            tabPanels.forEach((p) => p.classList.toggle('active', p.dataset.tab === name))
            try { localStorage.setItem('dsteem.activeTab', name) } catch (e) { /* ignore */ }
        })
    })
    try {
        const savedTab = localStorage.getItem('dsteem.activeTab')
        if (savedTab) {
            const btn = tabBtns.find((b) => b.dataset.tab === savedTab)
            if (btn) { btn.click() }
        }
    } catch (e) { /* ignore */ }

    // ---------- RPC selector ----------
    const rpcSelect = document.getElementById('rpc-select')
    const rpcCustom = document.getElementById('rpc-custom')
    const netBanner = document.getElementById('net-banner')

    function currentRpc() {
        if (rpcSelect.value === '__custom__') { return rpcCustom.value.trim() || 'https://api.steemit.com' }
        return rpcSelect.value
    }

    const MAINNET_HOSTS = new Set(['api.steemit.com', 'api.moecki.online', 'api.hive.blog']) // hive included as a sanity check; user pasting hive should still see the banner
    function isMainnet() {
        try {
            const u = new URL(currentRpc())
            return MAINNET_HOSTS.has(u.host) || u.host.endsWith('.steemit.com') || u.host.endsWith('.moecki.online')
        } catch (e) { return false }
    }

    function updateNetBanner() {
        if (isMainnet()) {
            netBanner.textContent = 'MAINNET — broadcasts are real and irreversible'
            netBanner.classList.remove('testnet')
            netBanner.style.display = ''
        } else {
            netBanner.textContent = 'NON-MAINNET — ' + currentRpc()
            netBanner.classList.add('testnet')
            netBanner.style.display = ''
        }
    }

    let _client = null
    function rebuildClient() {
        if (!window.dsteem) { return }
        try {
            _client = new window.dsteem.Client(currentRpc(), {timeout: 8000})
        } catch (e) {
            window.dsteemLog.error('Client construction failed', e)
            _client = null
        }
    }

    rpcSelect.addEventListener('change', () => {
        rpcCustom.hidden = (rpcSelect.value !== '__custom__')
        try { localStorage.setItem('dsteem.rpc', rpcSelect.value) } catch (e) { /* ignore */ }
        if (rpcSelect.value === '__custom__' && !rpcCustom.value) { rpcCustom.focus() }
        rebuildClient()
        updateNetBanner()
        emitStateChange()
    })
    rpcCustom.addEventListener('change', () => {
        try { localStorage.setItem('dsteem.rpcCustom', rpcCustom.value) } catch (e) { /* ignore */ }
        rebuildClient()
        updateNetBanner()
        emitStateChange()
    })

    try {
        const savedRpc = localStorage.getItem('dsteem.rpc')
        const savedCustom = localStorage.getItem('dsteem.rpcCustom')
        if (savedRpc) {
            rpcSelect.value = savedRpc
            rpcCustom.hidden = (savedRpc !== '__custom__')
        }
        if (savedCustom) { rpcCustom.value = savedCustom }
    } catch (e) { /* ignore */ }

    // ---------- Account name ----------
    const acctInput = document.getElementById('account-input')
    try {
        const savedAcct = localStorage.getItem('dsteem.account')
        if (savedAcct) { acctInput.value = savedAcct }
    } catch (e) { /* ignore */ }
    acctInput.addEventListener('input', () => {
        try { localStorage.setItem('dsteem.account', acctInput.value.trim()) } catch (e) { /* ignore */ }
        emitStateChange()
    })

    // ---------- Key panel ----------
    const wifModeFields = document.getElementById('key-wif-mode')
    const loginModeFields = document.getElementById('key-login-mode')
    const wifInput = document.getElementById('key-wif')
    const wifRole = document.getElementById('key-role-wif')
    const loginUser = document.getElementById('login-user')
    const loginPass = document.getElementById('login-pass')
    const loginRole = document.getElementById('key-role-login')
    const derivedPub = document.getElementById('derived-pubkey')

    document.querySelectorAll('input[name="key-mode"]').forEach((r) => {
        r.addEventListener('change', () => {
            const mode = document.querySelector('input[name="key-mode"]:checked').value
            wifModeFields.hidden = (mode !== 'wif')
            loginModeFields.hidden = (mode !== 'login')
            refreshDerived()
            emitStateChange()
        })
    })

    function currentKey() {
        if (!window.dsteem) { return null }
        const mode = document.querySelector('input[name="key-mode"]:checked').value
        try {
            if (mode === 'wif') {
                const w = wifInput.value.trim()
                if (!w) { return null }
                return window.dsteem.PrivateKey.fromString(w)
            } else {
                const u = loginUser.value.trim()
                const p = loginPass.value
                if (!u || !p) { return null }
                return window.dsteem.PrivateKey.fromLogin(u, p, loginRole.value)
            }
        } catch (e) {
            return null
        }
    }

    function refreshDerived() {
        const k = currentKey()
        if (!k) { derivedPub.textContent = '—'; return }
        try {
            derivedPub.textContent = k.createPublic().toString()
        } catch (e) {
            derivedPub.textContent = '(invalid key: ' + e.message + ')'
        }
    }

    ;[wifInput, wifRole, loginUser, loginPass, loginRole].forEach((inp) => {
        inp.addEventListener('input', () => { refreshDerived(); emitStateChange() })
        inp.addEventListener('change', () => { refreshDerived(); emitStateChange() })
    })

    // ---------- Default mode toggle ----------
    document.querySelectorAll('input[name="default-mode"]').forEach((r) => {
        r.addEventListener('change', () => {
            const mode = document.querySelector('input[name="default-mode"]:checked').value
            document.dispatchEvent(new CustomEvent('dsteem:default-mode', {detail: mode}))
        })
    })

    // ---------- Shared state event ----------
    function emitStateChange() {
        document.dispatchEvent(new CustomEvent('dsteem:state-change'))
    }

    // ---------- Public app handle ----------
    window.dsteemApp = {
        getClient() {
            if (!_client) { rebuildClient() }
            if (!_client) { throw new Error('No client — check bundle loaded and RPC URL is valid') }
            return _client
        },
        getKey: currentKey,
        canSign() { return currentKey() != null },
        isMainnet,
        getChainId() { return this.getClient().chainId },
        getAccountName() { return acctInput.value.trim() },
        currentRpc
    }

    // Initial render
    rebuildClient()
    updateNetBanner()
    refreshDerived()

    if (window.dsteem) {
        window.dsteemLog.info(`dsteem v${window.dsteem.VERSION} loaded. RPC: ${currentRpc()}. ${isMainnet() ? 'MAINNET' : 'NON-MAINNET'}.`)
    }
})()
