import {
    mockContract,
    testEmailConfig,
    testStateAnalystsEmails,
} from '../../testHelpers/emailerHelpers'
import { sendWithdrawnSubmissionCMSEmail } from './sendWithdrawnSubmissionCMSEmail'

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
const stateAnalystEmails = () => [...testStateAnalystsEmails]

describe('sendWithdrawnSubmissionCMSEmail', () => {
    it('CMS email contains correct toAddresses', async () => {
        const template = await sendWithdrawnSubmissionCMSEmail(
            testContract,
            testRatesForDisplay,
            stateAnalystEmails(),
            testEmailConfig()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.toAddresses).toEqual(
            expect.arrayContaining([
                ...stateAnalystEmails(),
                ...testEmailConfig().dmcpSubmissionEmails,
                ...testEmailConfig().oactEmails,
            ])
        )
    })

    it('renders overall email for withdrawn contract as expected', async () => {
        const template = await sendWithdrawnSubmissionCMSEmail(
            testContract,
            testRatesForDisplay,
            stateAnalystEmails(),
            testEmailConfig()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })
})

describe('sendWithdrawnSubmissionCMSEmail error handling', () => {
    it('returns an error if contract consolidated status is not WITHDRAWN', async () => {
        const contractWithWrongStatus = {
            ...testContract,
            consolidatedStatus: 'RESUBMITTED' as const,
        }

        const template = await sendWithdrawnSubmissionCMSEmail(
            contractWithWrongStatus,
            testRatesForDisplay,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Contract consolidated status should be WITHDRAWN'
        )
    })

    it('returns an error if review status actions is empty', async () => {
        const contractWithMissingReviewActions = {
            ...testContract,
            reviewStatusActions: [],
        }

        const template = await sendWithdrawnSubmissionCMSEmail(
            contractWithMissingReviewActions,
            testRatesForDisplay,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Latest contract review action is not WITHDRAW'
        )
    })

    it('returns an error if the latest contract review action is not WITHDRAW', async () => {
        const contractWithWrongActionType = {
            ...testContract,
            reviewStatusActions: [
                {
                    updatedAt: new Date('2025-04-10'),
                    updatedBy: {
                        role: 'CMS_USER' as const,
                        email: 'zuko@example.com',
                        givenName: 'Zuko',
                        familyName: 'Hotman',
                    },
                    updatedReason: 'Test Withdraw',
                    dateApprovalReleasedToState: undefined,
                    actionType: 'UNDER_REVIEW' as const,
                    contractID: 'test-contract-123',
                },
            ],
        }

        const template = await sendWithdrawnSubmissionCMSEmail(
            contractWithWrongActionType,
            testRatesForDisplay,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Latest contract review action is not WITHDRAW'
        )
    })
})
