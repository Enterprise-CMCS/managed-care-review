import { UpdateInfoType } from '../../domain-models'
import { ContractRevision } from './contractType'

// Rate represents the rate specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
interface Rate {
    id: string
    revisions: RateRevision[]
}

// RateRevision has all the information in a single submission of this rate.
// If a revision has been submitted it will have submitInfo (otherwise it will be a draft)
// if a revision was unlocked, it will have unlock info, otherwise it was an initial submission
// The set of contractRevisions hold exactly what contract data was present at the time this rate was submitted.
interface RateRevision {
    id: string
    unlockInfo?: UpdateInfoType
    submitInfo?: UpdateInfoType

    revisionFormData: string
    contractRevisions?: ContractRevision[]
}

export type { Rate, RateRevision }
