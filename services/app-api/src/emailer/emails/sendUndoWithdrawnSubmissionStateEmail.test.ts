import { mockContract, testEmailConfig } from '../../testHelpers/emailerHelpers'
import { sendUndoWithdrawnSubmissionStateEmail } from './sendUndoWithdrawnSubmissionStateEmail'

const testContract = mockContract({
    id: 'test-contract-123',
    consolidatedStatus: 'RESUBMITTED',
    reviewStatusActions: [
        {
            updatedAt: new Date('2025-05-10'),
            updatedBy: {
                role: 'CMS_USER',
                email: 'zuko@example.com',
                givenName: 'Zuko',
                familyName: 'Hotman',
            },
            updatedReason: 'Test Undo Withdraw',
            dateApprovalReleasedToState: undefined,
            actionType: 'UNDER_REVIEW',
            contractID: 'test-contract-123',
        },
        {
            updatedAt: new Date('2025-04-10'),
            updatedBy: {
                role: 'CMS_USER',
                email: 'zuko@example.com',
                givenName: 'Zuko',
                familyName: 'Hotman',
            },
            updatedReason: 'Test Withdraw',
            dateApprovalReleasedToState: undefined,
            actionType: 'WITHDRAW',
            contractID: 'test-contract-123',
        },
    ],
})

const testRatesForDisplay = [
    {
        id: 'rate-123',
        rateCertificationName: 'rate-name-123',
    },
    {
        id: 'rate-321',
        rateCertificationName: 'rate-name-321',
    },
]

describe('sendUndoWithdrawnSubmissionStateEmail', () => {
    it('State email contains correct toAddresses', async () => {
        const template = await sendUndoWithdrawnSubmissionStateEmail(
            testContract,
            testRatesForDisplay,
            testEmailConfig()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.toAddresses).toEqual(
            expect.arrayContaining([
                'contract-state-contact@example.com',
                ...testEmailConfig().devReviewTeamEmails,
            ])
        )
    })

    it('renders overall email for undo withdraw contract as expected', async () => {
        const template = await sendUndoWithdrawnSubmissionStateEmail(
            testContract,
            testRatesForDisplay,
            testEmailConfig()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })
})
