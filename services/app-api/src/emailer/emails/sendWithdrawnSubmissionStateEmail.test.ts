import { mockContract, testEmailConfig } from '../../testHelpers/emailerHelpers'
import { sendWithdrawnSubmissionStateEmail } from './sendWithdrawnSubmissionStateEmail'

const testContract = mockContract({
    id: 'test-contract-123',
    consolidatedStatus: 'WITHDRAWN',
    reviewStatusActions: [
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

describe('sendWithdrawnSubmissionStateEmail', () => {
    it('State email contains correct toAddresses', async () => {
        const template = await sendWithdrawnSubmissionStateEmail(
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

    it('renders overall email for withdrawn contract as expected', async () => {
        const template = await sendWithdrawnSubmissionStateEmail(
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
