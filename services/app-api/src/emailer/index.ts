export { getSESEmailParams, sendSESEmail } from './awsSES'
export { newLocalEmailer, newSESEmailer } from './emailer'
export {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmitPackageStateEmail,
    resubmitPackageCMSEmail,
    qaStateEmail,
} from './emails'
export type {
    EmailConfiguration,
    EmailData,
    Emailer,
    StateAnalystsEmails,
} from './emailer'
