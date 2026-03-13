import type { ContractType } from '../../domain-models'
import {
    mockEQROContract,
    mockMNState,
    testEmailConfig,
} from '../../testHelpers/emailerHelpers'
import { sendEQROContractResubmitCMSEmail } from './sendEQROContractResubmitCMSEmail'

const updateInfo = {
    updatedBy: {
        email: 'house@example.com',
        role: 'STATE_USER' as const,
        givenName: 'Gregory',
        familyName: 'House',
    },
    updatedAt: new Date('03/09/2026'),
    updatedReason: 'Updated info',
}

describe('sendEQROContractResubmitCMSEmail', () => {
    const stateAnalystsEmails = ['analyst1@cms.gov', 'analyst2@cms.gov']

    it('should render email for EQRO resubmit with no change in review determination', async () => {
        const baseSubmission = mockEQROContract()
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [
                baseSubmission.packageSubmissions[0],
                baseSubmission.packageSubmissions[0],
            ],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitCMSEmail(
            contract,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.subject).toContain('was resubmitted')
        expect(template.bodyText).toContain('was resubmitted')
        expect(template.bodyText).toContain(
            'Subject to formal review and approval'
        )
        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('should render email for EQRO resubmit when changed from subject to review to not subject to review', async () => {
        const baseSubmission = mockEQROContract()
        const previousSubmission = baseSubmission.packageSubmissions[0]
        const currentSubmission = {
            ...previousSubmission,
            contractRevision: {
                ...previousSubmission.contractRevision,
                formData: {
                    ...previousSubmission.contractRevision.formData,
                    eqroProvisionMcoNewOptionalActivity: false,
                    eqroProvisionNewMcoEqrRelatedActivities: false,
                },
            },
        }
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [currentSubmission, previousSubmission],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitCMSEmail(
            contract,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.subject).toContain('review decision update')
        expect(template.bodyText).toContain('is no longer subject to review')
        expect(template.bodyText).toContain(
            'Not subject to formal review and approval'
        )
        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('should render email for EQRO resubmit when changed from not subject to review to subject to review', async () => {
        const baseSubmission = mockEQROContract()
        const previousSubmission = {
            ...baseSubmission.packageSubmissions[0],
            contractRevision: {
                ...baseSubmission.packageSubmissions[0].contractRevision,
                formData: {
                    ...baseSubmission.packageSubmissions[0].contractRevision
                        .formData,
                    eqroProvisionMcoNewOptionalActivity: false,
                    eqroProvisionNewMcoEqrRelatedActivities: false,
                },
            },
        }
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [
                baseSubmission.packageSubmissions[0],
                previousSubmission,
            ],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitCMSEmail(
            contract,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.subject).toContain('review decision update')
        expect(template.bodyText).toContain('is now subject to review')
        expect(template.bodyText).toContain(
            'Subject to formal review and approval'
        )
        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('should include DMCO emails in toAddresses', async () => {
        const baseSubmission = mockEQROContract()
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [
                baseSubmission.packageSubmissions[0],
                baseSubmission.packageSubmissions[0],
            ],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitCMSEmail(
            contract,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        stateAnalystsEmails.forEach((email) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining(emailConfig.dmcoEmails),
                })
            )
        })
    })

    it('should include link to submission', async () => {
        const baseSubmission = mockEQROContract()
        const contract: ContractType = mockEQROContract({
            packageSubmissions: [
                baseSubmission.packageSubmissions[0],
                baseSubmission.packageSubmissions[0],
            ],
        })
        const statePrograms = mockMNState().programs
        const emailConfig = testEmailConfig()

        const template = await sendEQROContractResubmitCMSEmail(
            contract,
            updateInfo,
            emailConfig,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    `http://localhost/submissions/eqro/${contract.id}`
                ),
            })
        )
    })
})
