import { z } from 'zod'

const emailSettingsSchema = z.object({
    emailSource: z.string(),
    devReviewTeamEmails: z.array(z.string()),
    cmsReviewHelpEmailAddress: z.array(z.string()),
    cmsRateHelpEmailAddress: z.array(z.string()),
    oactEmails: z.array(z.string()),
    dmcpReviewEmails: z.array(z.string()),
    dmcpSubmissionEmails: z.array(z.string()),
    dmcoEmails: z.array(z.string()),
    helpDeskEmail: z.array(z.string()),
})

const applicationSettingsSchema = z.object({
    emailSettings: emailSettingsSchema,
})

type EmailSettingsType = z.infer<typeof emailSettingsSchema>
type ApplicationSettingsType = z.infer<typeof applicationSettingsSchema>

export type { EmailSettingsType, ApplicationSettingsType }
export { applicationSettingsSchema, emailSettingsSchema }