import { mockContractPackageDraft } from '@mc-review/mocks'
import type { ContractFormData } from '../../gen/gqlClient'
import { getFormFlow, type FormFlowContext } from './FormFlow'

const formData = (overrides: Partial<ContractFormData>): ContractFormData => ({
    ...mockContractPackageDraft().draftRevision!.formData,
    ...overrides,
})

const flags = (overrides: Partial<FormFlowContext> = {}): FormFlowContext => ({
    hideSupportingDocs: true,
    showProcurementAttestation: false,
    ...overrides,
})

describe('getFormFlow for ENROLLMENT_BROKER', () => {
    it('lists the EB steps in order with the custom first step title', () => {
        const flow = getFormFlow(
            'ENROLLMENT_BROKER',
            'SUBMISSIONS_TYPE',
            flags()
        )
        expect(flow.formPages).toEqual([
            'SUBMISSIONS_TYPE',
            'SUBMISSIONS_CONTRACT_DETAILS',
            'SUBMISSIONS_ASSOCIATED_CONTRACTS',
            'SUBMISSIONS_CONTACTS',
            'SUBMISSIONS_REVIEW_SUBMIT',
        ])
        expect(flow.customPageTitles).toEqual({
            SUBMISSIONS_TYPE: 'Submission details',
        })
    })

    it.each([
        ['SUBMISSIONS_TYPE', undefined, 'SUBMISSIONS_CONTRACT_DETAILS'],
        [
            'SUBMISSIONS_CONTRACT_DETAILS',
            'SUBMISSIONS_TYPE',
            'SUBMISSIONS_ASSOCIATED_CONTRACTS',
        ],
        [
            'SUBMISSIONS_ASSOCIATED_CONTRACTS',
            'SUBMISSIONS_CONTRACT_DETAILS',
            'SUBMISSIONS_CONTACTS',
        ],
        [
            'SUBMISSIONS_CONTACTS',
            'SUBMISSIONS_ASSOCIATED_CONTRACTS',
            'SUBMISSIONS_REVIEW_SUBMIT',
        ],
        ['SUBMISSIONS_REVIEW_SUBMIT', 'SUBMISSIONS_CONTACTS', undefined],
    ] as const)(
        '%s goes back to %s and continues to %s',
        (page, previous, next) => {
            const flow = getFormFlow('ENROLLMENT_BROKER', page, flags())
            expect(flow.previous).toBe(previous)
            expect(flow.next).toBe(next)
        }
    )

    it('ignores the health plan flags and form data', () => {
        const flow = getFormFlow(
            'ENROLLMENT_BROKER',
            'SUBMISSIONS_CONTACTS',
            flags({
                hideSupportingDocs: false,
                showProcurementAttestation: true,
                formData: formData({ contractType: 'BASE' }),
            })
        )
        expect(flow.previous).toBe('SUBMISSIONS_ASSOCIATED_CONTRACTS')
        expect(flow.next).toBe('SUBMISSIONS_REVIEW_SUBMIT')
    })

    it('has no previous or next page when the current page is not in the flow', () => {
        const flow = getFormFlow(
            'ENROLLMENT_BROKER',
            'SUBMISSIONS_RATE_DETAILS',
            flags()
        )
        expect(flow.previous).toBeUndefined()
        expect(flow.next).toBeUndefined()
    })
})
