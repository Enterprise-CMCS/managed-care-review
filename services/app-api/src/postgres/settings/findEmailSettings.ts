
import type { EmailSettingsType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'

export async function findEmailSettings(
    client: ExtendedPrismaClient
): Promise<EmailSettingsType | Error> {
    try {
        const result = await client.emailSettings.findUnique({
            where: {
                id: 1, //There is only one row in the email_settings table
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

        if (!result) {
            return new Error('Prisma Error: Email settings not found')
        }

        return result
    } catch (err) {
        console.error('PRISMA ERROR: Error withdrawing rate', err)
        return err
    }
}
