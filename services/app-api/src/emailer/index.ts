export { getSESEmailParams, sendSESEmail } from './awsSES'
export { newLocalEmailer, newSESEmailer } from './emailer'
export {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    resubmittedStateEmail,
    resubmittedCMSEmail,
} from './templates'

export type { UpdatedEmailData } from './templates'
export type {
    EmailConfiguration,
    EmailData,
    Emailer,
    StateAnalystsEmails,
} from './emailer'
