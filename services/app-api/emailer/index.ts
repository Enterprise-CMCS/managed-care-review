export { getSESEmailParams, sendSESEmail } from './awsSES'
export { newLocalEmailer, newSESEmailer } from './emailer'
export { newSubmissionCMSEmailTemplate, newEmailTemplate } from './templates'

export type { EmailTemplateName, EmailTemplateParams } from './templates'
export type { EmailConfiguration, EmailData, Emailer } from './emailer'
