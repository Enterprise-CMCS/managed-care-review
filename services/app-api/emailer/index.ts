export { getSESEmailParams, sendSESEmail } from './awsSES'
export { newLocalEmailer, newSESEmailer } from './emailer'
export {
    newPackageCMSEmail,
    newPackageStateEmail,
    unlockPackageCMSEmail,
    unlockPackageStateEmail,
    UnlockEmailData,
} from './templates'

export type { EmailConfiguration, EmailData, Emailer } from './emailer'
