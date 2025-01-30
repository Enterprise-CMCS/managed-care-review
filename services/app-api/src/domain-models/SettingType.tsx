import { z } from 'zod'

const emailSettingsSchema = z.object({
    emailSource: z.string().email(),
    devReviewTeamEmails: z.array(z.string().email()),
    cmsReviewHelpEmailAddress: z.array(z.string().email()),
    cmsRateHelpEmailAddress: z.array(z.string().email()),
    oactEmails: z.array(z.string().email()),
    dmcpReviewEmails: z.array(z.string().email()),
    dmcpSubmissionEmails: z.array(z.string().email()),
    dmcoEmails: z.array(z.string().email()),
    helpDeskEmail: z.array(z.string().email()),
})

const applicationSettingsSchema = z.object({
    emailSettings: emailSettingsSchema,
})

type EmailSettingsType = z.infer<typeof emailSettingsSchema>
type ApplicationSettingsType = z.infer<typeof applicationSettingsSchema>

export type { EmailSettingsType, ApplicationSettingsType }
export { applicationSettingsSchema, emailSettingsSchema }