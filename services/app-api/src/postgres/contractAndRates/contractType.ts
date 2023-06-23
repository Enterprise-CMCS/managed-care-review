import { UpdateInfoType } from '../../domain-models'
import { RateRevision } from './rateType'

// Contract represents the contract specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
interface Contract {
    id: string
    revisions: ContractRevision[]
}

// ContractRevision has all the information in a single submission of this contract.
// If a revision has been submitted it will have submitInfo (otherwise it will be a draft)
// if a revision was unlocked, it will have unlock info, otherwise it was an initial submission
// The set of rateRevisions hold exactly what rate data was present at the time this contract was submitted.
interface ContractRevision {
    id: string
    unlockInfo?: UpdateInfoType
    submitInfo?: UpdateInfoType

    contractFormData: string
    rateRevisions: RateRevision[]
}

export type { Contract, ContractRevision }
