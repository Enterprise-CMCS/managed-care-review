export { getSESEmailParams, sendEmail } from './awsSES'
export { submissionReceivedCMSEmail } from './templates'

export { newLocalEmailer, newSESEmailer, isEmailData } from './emailer'
export type { Emailer, EmailConfiguration, EmailData } from './emailer'
