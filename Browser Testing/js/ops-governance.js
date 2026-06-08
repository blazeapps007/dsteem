/* Governance / proposal ops: create_proposal, update_proposal_votes, remove_proposal */
(function () {
    'use strict'
    if (typeof window.registerOp !== 'function') { return }

    function parseIdList(s) {
        return String(s || '').split(',').map((x) => x.trim()).filter(Boolean).map((x) => Number(x))
    }

    function isoIn(daysFromNow) {
        return new Date(Date.now() + daysFromNow * 86400 * 1000).toISOString().slice(0, 19)
    }

    registerOp({
        tab: 'governance', name: 'create_proposal', auth: 'active',
        description: 'Create an SPS (Steem Proposal System) proposal. Submission fee is paid in SBD.',
        fields: [
            {name: 'creator',    type: 'text', default: ''},
            {name: 'receiver',   type: 'text', default: '', hint: 'account that receives daily_pay'},
            {name: 'start_date', type: 'text', default: isoIn(1), hint: 'ISO, e.g. ' + isoIn(1)},
            {name: 'end_date',   type: 'text', default: isoIn(30), hint: 'ISO, e.g. ' + isoIn(30)},
            {name: 'daily_pay',  type: 'text', default: '1.000 SBD'},
            {name: 'subject',    type: 'text', default: 'Test proposal'},
            {name: 'permlink',   type: 'text', default: ''}
        ],
        build: (v) => ['create_proposal', {
            creator: v.creator, receiver: v.receiver,
            start_date: v.start_date, end_date: v.end_date,
            daily_pay: v.daily_pay, subject: v.subject, permlink: v.permlink,
            extensions: []
        }]
    })

    registerOp({
        tab: 'governance', name: 'update_proposal_votes', auth: 'posting',
        fields: [
            {name: 'voter',        type: 'text',     default: ''},
            {name: 'proposal_ids', type: 'text',     default: '', hint: 'comma-separated int64 IDs, e.g. "12,34"'},
            {name: 'approve',      type: 'checkbox', default: true}
        ],
        build: (v) => ['update_proposal_votes', {
            voter: v.voter,
            proposal_ids: parseIdList(v.proposal_ids),
            approve: !!v.approve,
            extensions: []
        }]
    })

    registerOp({
        tab: 'governance', name: 'remove_proposal', auth: 'active',
        fields: [
            {name: 'proposal_owner', type: 'text', default: ''},
            {name: 'proposal_ids',   type: 'text', default: '', hint: 'comma-separated int64 IDs'}
        ],
        build: (v) => ['remove_proposal', {
            proposal_owner: v.proposal_owner,
            proposal_ids: parseIdList(v.proposal_ids),
            extensions: []
        }]
    })
})()
