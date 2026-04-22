import {
    mockContract,
    mockEQROContract,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
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

    const withdrawReviewStatusActions = [
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

    it.each([
        {
            submissionType: 'HEALTH_PLAN' as const,
            contract: mockContract({
                id: 'test-contract-123',
                consolidatedStatus: 'WITHDRAWN',
                reviewStatusActions: withdrawReviewStatusActions,
            }),
            expectedPath: '/submissions/health-plan/test-contract-123',
            excludedPath: '/submissions/eqro/',
        },
        {
            submissionType: 'EQRO' as const,
            contract: mockEQROContract({
                id: 'test-contract-123',
                consolidatedStatus: 'WITHDRAWN',
                reviewStatusActions: withdrawReviewStatusActions,
            }),
            expectedPath: '/submissions/eqro/test-contract-123',
            excludedPath: '/submissions/health-plan/',
        },
    ])(
        'State email contains correct submission summary URL for $submissionType contract',
        async ({ contract, expectedPath, excludedPath }) => {
            const template = await sendWithdrawnSubmissionStateEmail(
                contract,
                testRatesForDisplay,
                testEmailConfig()
            )

            if (template instanceof Error) {
                throw template
            }

            expect(template.bodyHTML).toEqual(
                expect.stringContaining(
                    `${testEmailConfig().baseUrl}${expectedPath}`
                )
            )
            expect(template.bodyHTML).toEqual(
                expect.not.stringContaining(excludedPath)
            )
        }
    )
})
