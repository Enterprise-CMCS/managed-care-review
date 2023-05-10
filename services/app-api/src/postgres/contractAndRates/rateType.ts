import { UpdateInfoType } from "../../domain-models"
import { ContractRevision } from "./ContractType"

interface Rate {
    id: string
    revisions: RateRevision[]
}

interface RateRevision {
    id: string
    unlockInfo?: UpdateInfoType,
    submitInfo?: UpdateInfoType,

    revisionFormData: string
    contractRevisions?: ContractRevision[]
}

export type {
    Rate,
    RateRevision,
}
