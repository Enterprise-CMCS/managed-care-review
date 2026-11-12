import { mockContractPackageDraft } from '@mc-review/mocks'
import type { ContractFormData } from '../../gen/gqlClient'
import { FORM_FLOWS, getFormFlow, type FormFlowContext } from './FormFlow'

const formData = (overrides: Partial<ContractFormData>): ContractFormData => ({
    ...mockContractPackageDraft().draftRevision!.formData,
    ...overrides,
})

const flags = (overrides: Partial<FormFlowContext> = {}): FormFlowContext => ({
    hideSupportingDocs: true,
    showProcurementAttestation: false,
    ...overrides,
})

describe('getFormFlow', () => {
    it('defines a flow for every submission type, each with a unique, ordered page list', () => {
        Object.values(FORM_FLOWS).forEach(({ pages }) => {
            expect(pages[0]).toBe('SUBMISSIONS_TYPE')
            expect(pages[pages.length - 1]).toBe('SUBMISSIONS_REVIEW_SUBMIT')
            expect(new Set(pages).size).toBe(pages.length)
        })
    })

    describe('HEALTH_PLAN', () => {
        it('skips rate details for contract only submissions', () => {
            const flow = getFormFlow(
                'HEALTH_PLAN',
                'SUBMISSIONS_CONTRACT_DETAILS',
                flags({
                    formData: formData({ submissionType: 'CONTRACT_ONLY' }),
                })
            )
            expect(flow.formPages).not.toContain('SUBMISSIONS_RATE_DETAILS')
            expect(flow.previous).toBe('SUBMISSIONS_TYPE')
            expect(flow.next).toBe('SUBMISSIONS_CONTACTS')
        })

        it('goes contract details -> rate details -> contacts for contract and rates', () => {
            const context = flags({
                formData: formData({ submissionType: 'CONTRACT_AND_RATES' }),
            })
            expect(
                getFormFlow(
                    'HEALTH_PLAN',
                    'SUBMISSIONS_CONTRACT_DETAILS',
                    context
                ).next
            ).toBe('SUBMISSIONS_RATE_DETAILS')
            expect(
                getFormFlow('HEALTH_PLAN', 'SUBMISSIONS_CONTACTS', context)
                    .previous
            ).toBe('SUBMISSIONS_RATE_DETAILS')
        })

        it('includes attestations for BASE contracts when the flag is on', () => {
            const context = flags({
                showProcurementAttestation: true,
                formData: formData({
                    submissionType: 'CONTRACT_ONLY',
                    contractType: 'BASE',
                }),
            })
            expect(
                getFormFlow(
                    'HEALTH_PLAN',
                    'SUBMISSIONS_CONTRACT_DETAILS',
                    context
                ).next
            ).toBe('SUBMISSIONS_ATTESTATIONS')
            expect(
                getFormFlow('HEALTH_PLAN', 'SUBMISSIONS_CONTACTS', context)
                    .previous
            ).toBe('SUBMISSIONS_ATTESTATIONS')
        })

        it('leaves out attestations for AMENDMENT contracts even when the flag is on', () => {
            const flow = getFormFlow(
                'HEALTH_PLAN',
                'SUBMISSIONS_RATE_DETAILS',
                flags({
                    showProcurementAttestation: true,
                    formData: formData({ contractType: 'AMENDMENT' }),
                })
            )
            expect(flow.formPages).not.toContain('SUBMISSIONS_ATTESTATIONS')
            expect(flow.next).toBe('SUBMISSIONS_CONTACTS')
        })

        it('goes contacts -> supporting documents when supporting docs are shown', () => {
            const shown = getFormFlow(
                'HEALTH_PLAN',
                'SUBMISSIONS_CONTACTS',
                flags({ hideSupportingDocs: false })
            )
            const hidden = getFormFlow(
                'HEALTH_PLAN',
                'SUBMISSIONS_CONTACTS',
                flags({ hideSupportingDocs: true })
            )
            expect(shown.next).toBe('SUBMISSIONS_DOCUMENTS')
            expect(hidden.next).toBe('SUBMISSIONS_REVIEW_SUBMIT')
        })
    })

    describe('ENROLLMENT_BROKER', () => {
        it('goes associated contracts -> contacts -> review, ignoring health plan flags', () => {
            const context = flags({
                hideSupportingDocs: false,
                showProcurementAttestation: true,
                formData: formData({ contractType: 'BASE' }),
            })
            const flow = getFormFlow(
                'ENROLLMENT_BROKER',
                'SUBMISSIONS_CONTACTS',
                context
            )
            expect(flow.previous).toBe('SUBMISSIONS_ASSOCIATED_CONTRACTS')
            expect(flow.next).toBe('SUBMISSIONS_REVIEW_SUBMIT')
            expect(flow.customPageTitles).toEqual({
                SUBMISSIONS_TYPE: 'Submission details',
            })
        })
    })

    describe('EQRO', () => {
        it('goes contract details -> contacts -> review', () => {
            const flow = getFormFlow('EQRO', 'SUBMISSIONS_CONTACTS', flags())
            expect(flow.previous).toBe('SUBMISSIONS_CONTRACT_DETAILS')
            expect(flow.next).toBe('SUBMISSIONS_REVIEW_SUBMIT')
        })
    })

    it('has no previous page on the first step and no next page on the last', () => {
        expect(
            getFormFlow('EQRO', 'SUBMISSIONS_TYPE', flags()).previous
        ).toBeUndefined()
        expect(
            getFormFlow('EQRO', 'SUBMISSIONS_REVIEW_SUBMIT', flags()).next
        ).toBeUndefined()
    })

    it('has no previous or next page when the current page is not in the flow', () => {
        const flow = getFormFlow('EQRO', 'SUBMISSIONS_RATE_DETAILS', flags())
        expect(flow.previous).toBeUndefined()
        expect(flow.next).toBeUndefined()
    })
})
