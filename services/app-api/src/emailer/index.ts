export { getSESEmailParams, sendSESEmail } from './awsSES'
export { newLocalEmailer, newSESEmailer, emailer } from './emailer'
export {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmitPackageStateEmail,
    resubmitPackageCMSEmail,
    sendQuestionStateEmail,
    sendQuestionCMSEmail,
    sendQuestionResponseCMSEmail,
    sendQuestionResponseStateEmail,
} from './emails'
export type {
    EmailConfiguration,
    EmailData,
    Emailer,
    StateAnalystsEmails,
} from './emailer'
