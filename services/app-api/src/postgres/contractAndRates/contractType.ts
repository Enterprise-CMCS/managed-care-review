import { UpdateInfoType } from "../../domain-models"
import { RateRevision } from "./rateType"

interface Contract {
    id: string
    revisions: ContractRevision[]
}

// there needs to be a new contract revision after every set, even though the revision is the same?

// Revisions have descriptions by/when/reason ... maybe this pulls the rate revision if that made the change?
interface ContractRevision {
    // by/when/reason
    // contractFormData // this can be the same on different ones
    // rateRevisions, rateFormDatas?
    id: string
    unlockInfo?: UpdateInfoType,
    submitInfo?: UpdateInfoType,

    contractFormData: string
    rateRevisions: RateRevision[]
}

export type {
    Contract,
    ContractRevision,
}
