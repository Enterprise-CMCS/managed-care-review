import { z } from 'zod'

const emailAliasRegex = /^"?[^"]+?"?\s*<[^@\s]+@[^@\s]+\.[^@\s]+>$|^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const emailWithAliasSchema = z.string().trim().regex(emailAliasRegex);

const emailSettingsSchema = z.object({
    emailSource: emailWithAliasSchema,
    devReviewTeamEmails: z.array(emailWithAliasSchema).min(1),
    cmsReviewHelpEmailAddress: z.array(emailWithAliasSchema).min(1),
    cmsRateHelpEmailAddress: z.array(emailWithAliasSchema).min(1),
    oactEmails: z.array(emailWithAliasSchema).min(1),
    dmcpReviewEmails: z.array(emailWithAliasSchema).min(1),
    dmcpSubmissionEmails: z.array(emailWithAliasSchema).min(1),
    dmcoEmails: z.array(emailWithAliasSchema).min(1),
    helpDeskEmail: z.array(emailWithAliasSchema).min(1),
})

const applicationSettingsSchema = z.object({
    emailSettings: emailSettingsSchema,
})

type EmailSettingsType = z.infer<typeof emailSettingsSchema>
type ApplicationSettingsType = z.infer<typeof applicationSettingsSchema>

export type { EmailSettingsType, ApplicationSettingsType }
export { applicationSettingsSchema, emailSettingsSchema }