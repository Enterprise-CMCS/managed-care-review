import {
    mockContract,
    mockEQROContract,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
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
    expect(bodyHTML).toContain('If you need assistance or have any questions:')
    expect(bodyHTML).toContain(
        'For assistance with programmatic, contractual, or operational issues'
    )
    expect(bodyHTML).toContain('MCGDMCOactions@cms.hhs.gov')
    expect(bodyHTML).toContain(
        'For issues related to MC-Review or all other inquiries'
    )
    expect(bodyHTML).toContain('MC_Review_HelpDesk@cms.hhs.gov')
}

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

    it('renders EQRO email when undo withdraw returns to subject to review', async () => {
        const emailConfig = testEmailConfig()
        const template = await sendUndoWithdrawnSubmissionStateEmail(
            mockEQROUndoWithdrawContract(true),
            [],
            emailConfig
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.toAddresses).toEqual([
            'contract-state-contact@example.com',
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
        const template = await sendUndoWithdrawnSubmissionStateEmail(
            mockEQROUndoWithdrawContract(false),
            [],
            emailConfig
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.toAddresses).toEqual([
            'contract-state-contact@example.com',
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
