import {
    type EmailConfiguration,
    UpdateEmailSettingsDocument,
} from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    fetchTestMcReviewSettings,
    updateTestEmailSettings,
} from '../../testHelpers/gqlSettingsHelpers'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'

describe('updateEmailSettings', () => {
    const mockEmailConfigUpdate = (
        emailConfig?: Partial<EmailConfiguration>
    ): EmailConfiguration => ({
        cmsRateHelpEmailAddress: 'cmsRateHelpEmailAddress@example.com',
        cmsReviewHelpEmailAddress: 'cmsReviewHelpEmailAddress@example.com',
        devReviewTeamEmails: [
            'devReviewTeamEmail1@example.com',
            'devReviewTeamEmail2@example.com',
        ],
        dmcoEmails: ['dmcoEmail1@example.com', 'dmcoEmail2@example.com'],
        dmcpReviewEmails: [
            'dmcpReviewEmail1@example.com',
            'dmcpReviewEmail2@example.com',
        ],
        dmcpSubmissionEmails: [
            'dmcpSubmissionEmail1@example.com',
            'dmcpSubmissionEmail2@example.com',
        ],
        oactEmails: ['oactEmail1@example.com', 'oactEmail2@example.com'],
        emailSource: 'newSourceEmail@example.com',
        helpDeskEmail: 'newHelpDeskEmail@example.com',
        ...emailConfig,
    })

    it('updates email settings', async () => {
        const adminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
            },
        })

        const mcReviewSettings = await fetchTestMcReviewSettings(adminServer)
        const defaultEmailConfig = mcReviewSettings.emailConfiguration

        if (!defaultEmailConfig) {
            throw new Error('No email configuration found')
        }

        const emailConfigUpdate = mockEmailConfigUpdate()
        const updatedEmailSettings = await updateTestEmailSettings(
            adminServer,
            emailConfigUpdate
        )

        // expect our changes to match the updated email settings
        expect(updatedEmailSettings.emailConfiguration).toEqual(
            emailConfigUpdate
        )

        // reset email settings so other tests do no fail
        const restoredEmailSettings = await updateTestEmailSettings(
            adminServer,
            defaultEmailConfig
        )
        expect(restoredEmailSettings.emailConfiguration).toEqual(
            defaultEmailConfig
        )
    })
    it('errors when on failed email validations', async () => {
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
            },
        })

        const emailConfigUpdate = mockEmailConfigUpdate({
            dmcpReviewEmails: [
                'dmcpReviewEmail1@example.com',
                'dmcpReviewEmail2@example',
            ],
        })

        const updateEmailConfig = await executeGraphQLOperation(cmsServer, {
            query: UpdateEmailSettingsDocument,
            variables: {
                input: {
                    emailConfiguration: emailConfigUpdate,
                },
            },
        })

        expect(updateEmailConfig.errors).toBeDefined()
        expect(updateEmailConfig.errors?.[0].message).toContain(
            'Invalid email settings'
        )
    })
    it('errors when user is not an admin', async () => {
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
        })

        const emailConfigUpdate = mockEmailConfigUpdate()
        const updateEmailConfig = await executeGraphQLOperation(cmsServer, {
            query: UpdateEmailSettingsDocument,
            variables: {
                input: {
                    emailConfiguration: emailConfigUpdate,
                },
            },
        })

        expect(updateEmailConfig.errors).toBeDefined()
        expect(updateEmailConfig.errors?.[0].message).toBe(
            'user not authorized to update email settings'
        )
    })
})
