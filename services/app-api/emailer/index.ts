export { getSESEmailParams, sendSESEmail } from './awsSES'
export { newLocalEmailer, newSESEmailer } from './emailer'
export { newSubmissionCMSEmailTemplate, newEmailTemplate } from './templates'

export type { EmailTemplate } from './templates'
export type {
    EmailConfiguration,
    EmailData,
    Emailer,
    EmailTemplate,
} from './emailer'
