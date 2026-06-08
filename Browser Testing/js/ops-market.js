/* Market operations: feed_publish, convert, limit_order_create, limit_order_create2, limit_order_cancel, decline_voting_rights */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }

    function futureIso(secondsFromNow) {
        return new Date(Date.now() + secondsFromNow * 1000).toISOString().slice(0, 19)
    }

    function priceField(label, defaultBase, defaultQuote) {
        const el = window.dsteemForm.el
        const base = el('input', {type: 'text', class: 'mono', value: defaultBase, placeholder: 'base (e.g. "1.000 SBD")'})
        const quote = el('input', {type: 'text', class: 'mono', value: defaultQuote, placeholder: 'quote (e.g. "1.000 STEEM")'})
        const wrapper = el('div', {class: 'subgroup'},
            el('div', {class: 'subgroup-title'}, label + ' (PriceType: {base, quote})'),
            el('div', {class: 'row-list'},
                el('div', {class: 'row-item'}, el('span', {class: 'op-field-label', style: 'min-width:50px'}, 'base'), base),
                el('div', {class: 'row-item'}, el('span', {class: 'op-field-label', style: 'min-width:50px'}, 'quote'), quote)
            )
        )
        wrapper._read = () => ({base: base.value.trim(), quote: quote.value.trim()})
        return wrapper
    }

    registerOp({
        tab: 'market', name: 'feed_publish', auth: 'active',
        description: 'Witness price-feed publish. exchange_rate is a Price: {base: Asset(SBD), quote: Asset(STEEM)}.',
        render(container, ctx) {
            const el = ctx.el
            const publisher = el('input', {type: 'text', class: 'mono', placeholder: 'publisher witness account'})
            const price = priceField('exchange_rate', '0.250 SBD', '1.000 STEEM')

            container.appendChild(el('div', {class: 'op-fields'},
                el('div', {class: 'op-field'},
                    el('label', {class: 'op-field-label'}, 'publisher'), publisher
                ),
                price
            ))

            ctx.addSubmitRow(() => ['feed_publish', {
                publisher: publisher.value.trim(),
                exchange_rate: price._read()
            }])
        }
    })

    registerOp({
        tab: 'market', name: 'convert', auth: 'active',
        description: 'Convert SBD → STEEM at 3.5-day median price. amount must be SBD.',
        fields: [
            {name: 'owner',     type: 'text',   default: ''},
            {name: 'requestid', type: 'number', default: Date.now() & 0xffffffff, hint: 'uint32, unique per active request'},
            {name: 'amount',    type: 'text',   default: '0.001 SBD'}
        ],
        build: (v) => ['convert', {owner: v.owner, requestid: Number(v.requestid), amount: v.amount}]
    })

    registerOp({
        tab: 'market', name: 'limit_order_create', auth: 'active',
        fields: [
            {name: 'owner',          type: 'text',     default: ''},
            {name: 'orderid',        type: 'number',   default: Date.now() & 0xffffffff},
            {name: 'amount_to_sell', type: 'text',     default: '0.001 STEEM'},
            {name: 'min_to_receive', type: 'text',     default: '0.001 SBD'},
            {name: 'fill_or_kill',   type: 'checkbox', default: false},
            {name: 'expiration',     type: 'text',     default: futureIso(3600), hint: 'ISO time, e.g. ' + futureIso(3600)}
        ],
        build: (v) => ['limit_order_create', {
            owner: v.owner, orderid: Number(v.orderid),
            amount_to_sell: v.amount_to_sell, min_to_receive: v.min_to_receive,
            fill_or_kill: !!v.fill_or_kill, expiration: v.expiration
        }]
    })

    registerOp({
        tab: 'market', name: 'limit_order_create2', auth: 'active',
        description: 'Same as limit_order_create but uses a Price for exchange_rate.',
        render(container, ctx) {
            const el = ctx.el
            const owner = el('input', {type: 'text', class: 'mono'})
            const orderid = el('input', {type: 'number', value: String(Date.now() & 0xffffffff)})
            const amount = el('input', {type: 'text', class: 'mono', value: '0.001 STEEM'})
            const fok = el('input', {type: 'checkbox'})
            const exp = el('input', {type: 'text', class: 'mono', value: futureIso(3600)})
            const price = priceField('exchange_rate', '0.001 SBD', '0.001 STEEM')

            function f(label, input) {
                return el('div', {class: 'op-field'}, el('label', {class: 'op-field-label'}, label), input)
            }
            container.appendChild(el('div', {class: 'op-fields'},
                f('owner', owner),
                f('orderid', orderid),
                f('amount_to_sell', amount),
                f('fill_or_kill', fok),
                f('expiration', exp),
                price
            ))

            ctx.addSubmitRow(() => ['limit_order_create2', {
                owner: owner.value.trim(),
                orderid: Number(orderid.value),
                amount_to_sell: amount.value.trim(),
                fill_or_kill: fok.checked,
                exchange_rate: price._read(),
                expiration: exp.value.trim()
            }])
        }
    })

    registerOp({
        tab: 'market', name: 'limit_order_cancel', auth: 'active',
        fields: [
            {name: 'owner',   type: 'text',   default: ''},
            {name: 'orderid', type: 'number', default: 0}
        ],
        build: (v) => ['limit_order_cancel', {owner: v.owner, orderid: Number(v.orderid)}]
    })

    registerOp({
        tab: 'market', name: 'decline_voting_rights', auth: 'active',
        description: 'IRREVERSIBLE: permanently relinquishes the account\'s voting rights after a 30-day delay.',
        fields: [
            {name: 'account', type: 'text',     default: ''},
            {name: 'decline', type: 'checkbox', default: true, hint: 'set to false within the 30-day window to cancel'}
        ],
        build: (v) => ['decline_voting_rights', {account: v.account, decline: !!v.decline}]
    })
})()
