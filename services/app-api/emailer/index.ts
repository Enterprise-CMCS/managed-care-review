export { getSESEmailParams, sendSESEmail } from './awsSES'
export { newSubmissionCMSEmailTemplate } from './templates'

export { newLocalEmailer, newSESEmailer, isEmailData } from './emailer'
export type { Emailer, EmailConfiguration, EmailData } from './emailer'
