import {
    mockContract,
    mockEQROContract,
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

const undoWithdrawReviewStatusActions = (
    actionType: 'UNDER_REVIEW' | 'NOT_SUBJECT_TO_REVIEW'
) => [
    {
        updatedAt: new Date('2025-05-10'),
        updatedBy: {
            role: 'CMS_USER' as const,
            email: 'zuko@example.com',
            givenName: 'Zuko',
            familyName: 'Hotman',
        },
        updatedReason: 'Test Undo Withdraw',
        dateApprovalReleasedToState: undefined,
        actionType,
        contractID: 'test-contract-123',
    },
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
]

const mockEQROUndoWithdrawContract = (subjectToReview: boolean) => {
    const baseContract = mockEQROContract()
    const latestSubmission = baseContract.packageSubmissions[0]

    return mockEQROContract({
        id: 'test-contract-123',
        consolidatedStatus: subjectToReview
            ? 'RESUBMITTED'
            : 'NOT_SUBJECT_TO_REVIEW',
        reviewStatusActions: undoWithdrawReviewStatusActions(
            subjectToReview ? 'UNDER_REVIEW' : 'NOT_SUBJECT_TO_REVIEW'
        ),
        packageSubmissions: [
            {
                ...latestSubmission,
                contractRevision: {
                    ...latestSubmission.contractRevision,
                    formData: {
                        ...latestSubmission.contractRevision.formData,
                        eqroProvisionMcoEqrOrRelatedActivities: subjectToReview,
                        eqroProvisionMcoNewOptionalActivity: subjectToReview,
                        eqroProvisionNewMcoEqrRelatedActivities: false,
                    },
                },
            },
        ],
    })
}

const expectEQROUndoWithdrawContent = (
    bodyHTML: string | undefined,
    status: string,
    reviewDecision: string
) => {
    expect(bodyHTML).toContain(
        `Submission MCR-MN-0004-SNBC status was updated to '${status}' by CMS`
    )
    expect(bodyHTML).toContain(
        '<b>Withdraw reversed by:</b> <a href="mailto:zuko@example.com">zuko@example.com</a>'
    )
    expect(bodyHTML).toContain(`<b>Status:</b> ${status}`)
    expect(bodyHTML).toContain(`<b>Review decision:</b> ${reviewDecision}`)
    expect(bodyHTML).toContain(
        '<b>Reason for withdrawal reversal:</b> Test Undo Withdraw'
    )
    expect(bodyHTML).toContain(
        '<a href="http://localhost/submissions/eqro/test-contract-123">View submission</a>'
    )
}

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

    it('renders EQRO email when undo withdraw returns to subject to review', async () => {
        const emailConfig = testEmailConfig()
        const template = await sendUndoWithdrawnSubmissionCMSEmail(
            mockEQROUndoWithdrawContract(true),
            [],
            stateAnalystEmails(),
            emailConfig
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.toAddresses).toEqual([
            ...emailConfig.dmcoEmails,
            ...emailConfig.devReviewTeamEmails,
        ])
        expect(template.subject).toBe(
            "[LOCAL] MCR-MN-0004-SNBC status was updated to 'Submitted' by CMS"
        )
        expectEQROUndoWithdrawContent(
            template.bodyHTML,
            'Submitted',
            'Subject to formal review and approval'
        )
        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('renders EQRO email when undo withdraw returns to not subject to review', async () => {
        const emailConfig = testEmailConfig()
        const template = await sendUndoWithdrawnSubmissionCMSEmail(
            mockEQROUndoWithdrawContract(false),
            [],
            stateAnalystEmails(),
            emailConfig
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.toAddresses).toEqual([
            ...emailConfig.dmcoEmails,
            ...emailConfig.devReviewTeamEmails,
        ])
        expect(template.subject).toBe(
            "[LOCAL] MCR-MN-0004-SNBC status was updated to 'Not subject to review' by CMS"
        )
        expectEQROUndoWithdrawContent(
            template.bodyHTML,
            'Not subject to review',
            'Not subject to formal review and approval'
        )
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
            'Contract consolidated status is incorrect for UNDO_WITHDRAW email. Consolidated status: WITHDRAWN'
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
            'Latest contract review action is incorrect for UNDO_WITHDRAW email. Contract action: undefined'
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
            'Latest contract review action is incorrect for UNDO_WITHDRAW email. Contract action: WITHDRAW'
        )
    })
})
