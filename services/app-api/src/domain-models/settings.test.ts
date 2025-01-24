import { emailSettingsSchema } from './SettingType'

describe('emailSettingsSchema', () => {
    const validEmailsWithAlias = {
        emailSource: '"MC-Review CMS HHS" <local@example.com>',
        devReviewTeamEmails: [
            '"Dev Reviewer 1" <Dev.reviewer.1@example.com>',
            '"Dev Reviewer 2" <Dev.reviewer.2@example.com>',
        ],
        oactEmails: ['"OACT Reviewer 1" <oact-reviewer.1@example.com>'],
        dmcpReviewEmails: ['"DMCP Reviewer 1" <dmcp-reviewer.1@example.com>'],
        dmcpSubmissionEmails: [
            '"DMCP Submission 1" <dmcp-submission.1@example.com>',
            '"DMCP Submission 2" <dmcp-submission.2@example.com>',
        ],
        dmcoEmails: ['"DMCO Reviewer 1" <dmco-reviewer.1@example.com>'],
        cmsReviewHelpEmailAddress: [
            '"Contract Help" <contract.help@example.com>',
        ],
        cmsRateHelpEmailAddress: ['"Rate Help" <rate.help@example.com>'],
        helpDeskEmail: ['"Help Desk" <helpdesk@example.com>'],
    }

    const validEmailsWithoutAlias = {
        emailSource: 'local@example.com',
        devReviewTeamEmails: ['dev1@example.com'],
        oactEmails: ['oact1@example.com', 'oact2@example.com'],
        dmcpReviewEmails: ['dmcp1@example.com'],
        dmcpSubmissionEmails: ['dmcp.sub1@example.com'],
        dmcoEmails: ['dmco1@example.com'],
        cmsReviewHelpEmailAddress: ['cms.review@example.com'],
        cmsRateHelpEmailAddress: ['cms.rate@example.com'],
        helpDeskEmail: ['help@example.com'],
    }

    it('should validate emails with display names', () => {
        const result = emailSettingsSchema.safeParse(validEmailsWithAlias)
        expect(result.success).toBe(true)
    })

    it('should validate plain emails', () => {
        const result = emailSettingsSchema.safeParse(validEmailsWithoutAlias)
        expect(result.success).toBe(true)
    })

    it('should trim white space of emails', () => {
        const validEmailsWithAliasAndWhiteSpace = {
            emailSource: ' "MC-Review CMS HHS" <local@example.com> ',
            devReviewTeamEmails: [
                ' "Dev Reviewer 1" <Dev.reviewer.1@example.com> ',
                ' "Dev Reviewer 2" <Dev.reviewer.2@example.com> ',
            ],
            oactEmails: [' "OACT Reviewer 1" <oact-reviewer.1@example.com> '],
            dmcpReviewEmails: [
                '      "DMCP Reviewer 1" <dmcp-reviewer.1@example.com>  ',
            ],
            dmcpSubmissionEmails: [
                '"DMCP Submission 1" <dmcp-submission.1@example.com>       ',
                '"DMCP Submission 2" <dmcp-submission.2@example.com>',
            ],
            dmcoEmails: [
                '"DMCO Reviewer 1" <dmco-reviewer.1@example.com>         ',
            ],
            cmsReviewHelpEmailAddress: [
                '      "Contract Help" <contract.help@example.com>',
            ],
            cmsRateHelpEmailAddress: [' "Rate Help" <rate.help@example.com>'],
            helpDeskEmail: [' "Help Desk" <helpdesk@example.com>'],
        }
        const result = emailSettingsSchema.safeParse(
            validEmailsWithAliasAndWhiteSpace
        )

        expect(result.success).toBe(true)
        expect(result.data).toEqual(validEmailsWithAlias)
    })

    it('should reject empty email settings', () => {
        const invalidData = { ...validEmailsWithAlias }
        invalidData.helpDeskEmail = []
        const result = emailSettingsSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
    })

    it('should reject invalid email format', () => {
        const invalidData = { ...validEmailsWithAlias }
        invalidData.emailSource = 'invalid-email'
        const result = emailSettingsSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
    })

    it('should reject empty email arrays', () => {
        const invalidData = { ...validEmailsWithAlias }
        invalidData.devReviewTeamEmails = []
        const result = emailSettingsSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
    })

    it('should reject malformed email aliases', () => {
        const invalidData = { ...validEmailsWithAlias }
        invalidData.emailSource = '"Bad Format" bad@example.com>'
        const result = emailSettingsSchema.safeParse(invalidData)
        expect(result.success).toBe(false)
    })
})
