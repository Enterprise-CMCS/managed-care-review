import type { PrismaClient } from '@prisma/client'
import type { EmailSettingsType } from '../../domain-models'

export async function updateEmailSettings(
    client: PrismaClient,
    emailSettings: EmailSettingsType
): Promise<EmailSettingsType | Error> {
    try {
        const result = await client.emailSettings.update({
            where: {
                id: 1, //There is only one row in the email_settings table
            },
            data: {
                emailSource: emailSettings.emailSource,
                devReviewTeamEmails: emailSettings.devReviewTeamEmails,
                cmsReviewHelpEmailAddress:
                    emailSettings.cmsReviewHelpEmailAddress,
                cmsRateHelpEmailAddress: emailSettings.cmsRateHelpEmailAddress,
                oactEmails: emailSettings.oactEmails,
                dmcpReviewEmails: emailSettings.dmcpReviewEmails,
                dmcpSubmissionEmails: emailSettings.dmcpSubmissionEmails,
                dmcoEmails: emailSettings.dmcoEmails,
                helpDeskEmail: emailSettings.helpDeskEmail,
            },
            select: {
                emailSource: true,
                devReviewTeamEmails: true,
                cmsReviewHelpEmailAddress: true,
                cmsRateHelpEmailAddress: true,
                oactEmails: true,
                dmcpReviewEmails: true,
                dmcpSubmissionEmails: true,
                dmcoEmails: true,
                helpDeskEmail: true,
            }, // excludes the applicationSettingsId field
        })

        return result
    } catch (err) {
        console.error('PRISMA ERROR: Error updating email settings', err)
        return err
    }
}
