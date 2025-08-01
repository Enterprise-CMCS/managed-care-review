import {
    type EmailConfiguration,
    UpdateEmailSettingsDocument,
} from '../../gen/gqlClient'
import { constructTestPostgresServer, extractGraphQLResponse } from '../../testHelpers/gqlHelpers'
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
        const adminUser = testAdminUser()
        const adminContext = { user: adminUser }
        const adminServer = await constructTestPostgresServer({
            context: adminContext,
        })

        const mcReviewSettings = await fetchTestMcReviewSettings(adminServer, adminContext)
        const defaultEmailConfig = mcReviewSettings.emailConfiguration

        if (!defaultEmailConfig) {
            throw new Error('No email configuration found')
        }

        const emailConfigUpdate = mockEmailConfigUpdate()
        const updatedEmailSettings = await updateTestEmailSettings(
            adminServer,
            emailConfigUpdate,
            adminContext
        )

        // expect our changes to match the updated email settings
        expect(updatedEmailSettings.emailConfiguration).toEqual(
            emailConfigUpdate
        )

        // reset email settings so other tests do no fail
        const restoredEmailSettings = await updateTestEmailSettings(
            adminServer,
            defaultEmailConfig,
            adminContext
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

        const updateEmailConfig = await cmsServer.executeOperation({
            query: UpdateEmailSettingsDocument,
            variables: {
                input: {
                    emailConfiguration: emailConfigUpdate,
                },
            },
        }, {
            contextValue: {
                user: testAdminUser(),
            },
        })

        const result = extractGraphQLResponse(updateEmailConfig)
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].message).toContain(
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
        const updateEmailConfig = await cmsServer.executeOperation({
            query: UpdateEmailSettingsDocument,
            variables: {
                input: {
                    emailConfiguration: emailConfigUpdate,
                },
            },
        }, {
            contextValue: {
                user: testCMSUser(),
            },
        })

        const result = extractGraphQLResponse(updateEmailConfig)
        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].message).toBe(
            'user not authorized to update email settings'
        )
    })
})
