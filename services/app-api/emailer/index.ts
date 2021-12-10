export { getSESEmailParams, sendSESEmail } from './awsSES'
export { newLocalEmailer, newSESEmailer } from './emailer'
export {
    newPackageCMSEmailTemplate,
    newPackageStateEmailTemplate,
} from './templates'

export type { EmailConfiguration, EmailData, Emailer } from './emailer'
