import {
    mockContract,
    testEmailConfig,
    testStateAnalystsEmails,
} from '../../testHelpers/emailerHelpers'
import { sendUndoWithdrawnSubmissionCMSEmail } from './sendUndoWithdrawnSubmissionCMSEmail'

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
const stateAnalystEmails = () => [...testStateAnalystsEmails]

describe('sendUndoWithdrawnSubmissionCMSEmail', () => {
    it('CMS email contains correct toAddresses', async () => {
        const template = await sendUndoWithdrawnSubmissionCMSEmail(
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

    it('renders overall email for undo withdraw contract as expected', async () => {
        const template = await sendUndoWithdrawnSubmissionCMSEmail(
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

describe('sendUndoWithdrawnSubmissionCMSEmail error handling', () => {
    it('returns an error if contract consolidated status is not RESUBMITTED', async () => {
        const contractWithWrongStatus = {
            ...testContract,
            consolidatedStatus: 'WITHDRAWN' as const,
        }

        const template = await sendUndoWithdrawnSubmissionCMSEmail(
            contractWithWrongStatus,
            testRatesForDisplay,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Contract consolidated status should be RESUBMITTED'
        )
    })

    it('returns an error if review status actions is empty', async () => {
        const contractWithMissingReviewActions = {
            ...testContract,
            reviewStatusActions: [],
        }

        const template = await sendUndoWithdrawnSubmissionCMSEmail(
            contractWithMissingReviewActions,
            testRatesForDisplay,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Latest contract review action is not UNDER_REVIEW'
        )
    })

    it('returns an error if the latest contract review action is not UNDER_REVIEW', async () => {
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
                    actionType: 'WITHDRAW' as const,
                    contractID: 'test-contract-123',
                },
            ],
        }

        const template = await sendUndoWithdrawnSubmissionCMSEmail(
            contractWithWrongActionType,
            testRatesForDisplay,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Latest contract review action is not UNDER_REVIEW'
        )
    })
})
