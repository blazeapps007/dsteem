/* Witness ops: witness_update, witness_set_properties, account_witness_vote, account_witness_proxy */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }

    registerOp({
        tab: 'witness', name: 'account_witness_vote', auth: 'posting',
        fields: [
            {name: 'account', type: 'text',     default: ''},
            {name: 'witness', type: 'text',     default: ''},
            {name: 'approve', type: 'checkbox', default: true}
        ],
        build: (v) => ['account_witness_vote', {account: v.account, witness: v.witness, approve: !!v.approve}]
    })

    registerOp({
        tab: 'witness', name: 'account_witness_proxy', auth: 'posting',
        description: 'Set a proxy for witness voting. proxy="" removes the proxy.',
        fields: [
            {name: 'account', type: 'text', default: ''},
            {name: 'proxy',   type: 'text', default: '', hint: 'leave empty to clear'}
        ],
        build: (v) => ['account_witness_proxy', {account: v.account, proxy: v.proxy}]
    })

    registerOp({
        tab: 'witness', name: 'witness_update', auth: 'active',
        description: 'Register or update a witness. block_signing_key=null disables the witness.',
        render(container, ctx) {
            const el = ctx.el
            const owner = el('input', {type: 'text', class: 'mono'})
            const url = el('input', {type: 'text', class: 'mono'})
            const signingKey = el('input', {type: 'text', class: 'mono', placeholder: 'STM... or "null" to disable'})
            const acctFee = el('input', {type: 'text', class: 'mono', value: '3.000 STEEM'})
            const maxBlock = el('input', {type: 'number', value: '65536'})
            const sbdRate = el('input', {type: 'number', value: '1000', placeholder: '0–10000'})
            const fee = el('input', {type: 'text', class: 'mono', value: '0.000 STEEM', placeholder: 'witness registration fee'})

            function f(label, input, hint) {
                return el('div', {class: 'op-field'},
                    el('label', {class: 'op-field-label'}, label), input,
                    hint ? el('span', {class: 'op-field-hint'}, hint) : null
                )
            }

            const props = el('div', {class: 'subgroup'},
                el('div', {class: 'subgroup-title'}, 'props (ChainProperties)'),
                el('div', {class: 'op-fields'},
                    f('account_creation_fee', acctFee, 'Asset string'),
                    f('maximum_block_size', maxBlock, 'uint32'),
                    f('sbd_interest_rate', sbdRate, '0–10000')
                )
            )

            container.appendChild(el('div', {class: 'op-fields'},
                f('owner', owner),
                f('url', url),
                f('block_signing_key', signingKey, 'STM... pubkey, or "null"/empty to disable witness'),
                props,
                f('fee', fee, 'usually 0.000 STEEM after witness already registered')
            ))

            ctx.addSubmitRow(() => {
                const sk = signingKey.value.trim()
                const block_signing_key = (sk === '' || sk === 'null') ? null : sk
                return ['witness_update', {
                    owner: owner.value.trim(),
                    url: url.value.trim(),
                    block_signing_key,
                    props: {
                        account_creation_fee: acctFee.value.trim(),
                        maximum_block_size: Number(maxBlock.value),
                        sbd_interest_rate: Number(sbdRate.value)
                    },
                    fee: fee.value.trim()
                }]
            })
        }
    })

    registerOp({
        tab: 'witness', name: 'witness_set_properties', auth: 'active',
        description: 'Newer per-property setter. props is a list of [key, hex-encoded value] pairs (Buffer in TS terms).',
        render(container, ctx) {
            const el = ctx.el
            const owner = el('input', {type: 'text', class: 'mono'})
            container.appendChild(el('div', {class: 'op-field'},
                el('label', {class: 'op-field-label'}, 'owner'), owner
            ))

            const propsList = el('div', {class: 'row-list'})
            function addRow(k, v) {
                const kI = el('input', {type: 'text', class: 'mono', placeholder: 'key (e.g. "account_creation_fee")', value: k || ''})
                const vI = el('input', {type: 'text', class: 'mono', placeholder: 'value (hex)', value: v || ''})
                const rm = el('button', {class: 'btn-tiny', type: 'button'}, '×')
                const row = el('div', {class: 'row-item'}, kI, vI, rm)
                rm.addEventListener('click', () => row.remove())
                propsList.appendChild(row)
            }
            const addBtn = el('button', {class: 'btn-secondary', type: 'button'}, '+ property')
            addBtn.addEventListener('click', () => addRow('', ''))
            addRow('key', '')

            container.appendChild(el('div', {class: 'subgroup'},
                el('div', {class: 'subgroup-title'}, 'props — [key, hex-encoded value] pairs'),
                propsList,
                addBtn,
                el('div', {class: 'op-field-hint'},
                    'Each value must be the FC-serialized binary form of that property, hex-encoded. Look up the per-key format in steemd docs (e.g. key is varint+string+asset).')
            ))

            ctx.addSubmitRow(() => {
                const rows = propsList.querySelectorAll('.row-item')
                const props = []
                rows.forEach((r) => {
                    const inputs = r.querySelectorAll('input')
                    const k = inputs[0].value.trim()
                    const hex = inputs[1].value.trim().replace(/^0x/i, '')
                    if (k) {
                        props.push([k, Buffer.from(hex, 'hex')])
                    }
                })
                return ['witness_set_properties', {
                    owner: owner.value.trim(),
                    props,
                    extensions: []
                }]
            })
        }
    })
})()
