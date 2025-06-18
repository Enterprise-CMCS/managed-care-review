import {
    emailSettingsSchema,
    type EmailSettingsType,
    isAdminUser,
} from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
import type { Store } from '../../postgres'
import { setErrorAttributesOnActiveSpan } from '../attributeHelper'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { GraphQLError } from 'graphql'
import type { EmailConfiguration } from '../../gen/gqlClient'

// Both these functions are temporary until we get around to aligning the types
const emailConfigToEmailSettings = (
    emailConfiguration: EmailConfiguration
): EmailSettingsType => {
    return {
        emailSource: emailConfiguration.emailSource,
        devReviewTeamEmails: emailConfiguration.devReviewTeamEmails,
        oactEmails: emailConfiguration.oactEmails,
        dmcpReviewEmails: emailConfiguration.dmcpReviewEmails,
        dmcpSubmissionEmails: emailConfiguration.dmcpSubmissionEmails,
        dmcoEmails: emailConfiguration.dmcoEmails,
        cmsReviewHelpEmailAddress: [
            emailConfiguration.cmsReviewHelpEmailAddress,
        ],
        cmsRateHelpEmailAddress: [emailConfiguration.cmsRateHelpEmailAddress],
        helpDeskEmail: [emailConfiguration.helpDeskEmail],
    }
}

const emailSettingsToEmailConfig = (
    emailSettings: EmailSettingsType
): EmailConfiguration => {
    return {
        emailSource: emailSettings.emailSource,
        devReviewTeamEmails: emailSettings.devReviewTeamEmails,
        oactEmails: emailSettings.oactEmails,
        dmcpReviewEmails: emailSettings.dmcpReviewEmails,
        dmcpSubmissionEmails: emailSettings.dmcpSubmissionEmails,
        dmcoEmails: emailSettings.dmcoEmails,
        cmsReviewHelpEmailAddress: emailSettings.cmsReviewHelpEmailAddress[0],
        cmsRateHelpEmailAddress: emailSettings.cmsRateHelpEmailAddress[0],
        helpDeskEmail: emailSettings.helpDeskEmail[0],
    }
}

export function updateEmailSettings(
    store: Store
): MutationResolvers['updateEmailSettings'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const { emailConfiguration } = input
        const span = tracer?.startSpan('updateEmailSettings', {}, ctx)

        // Only users with the role ADMIN_USER can update email settings, excluding the help desk user
        if (!isAdminUser(user)) {
            const msg = 'user not authorized to update email settings'
            logError('updateEmailSettings', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createForbiddenError(msg)
        }

        const emailSettings = emailConfigToEmailSettings(emailConfiguration)
        const validatedEmailSettings =
            emailSettingsSchema.safeParse(emailSettings)

        if (!validatedEmailSettings.success) {
            const msg = `Invalid email settings: ${validatedEmailSettings.error}`
            logError('updateEmailSettings', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw createUserInputError(msg, 'emailConfiguration')
        }

        const updatedEmailSettings =
            await store.updateEmailSettings(emailSettings)

        if (updatedEmailSettings instanceof Error) {
            const msg = `Issue updating email settings: ${updatedEmailSettings.message}`
            logError('updateEmailSettings', msg)
            setErrorAttributesOnActiveSpan(msg, span)
            throw new GraphQLError(msg, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const updatedEmailConfig =
            emailSettingsToEmailConfig(updatedEmailSettings)

        return {
            emailConfiguration: updatedEmailConfig,
        }
    }
}
