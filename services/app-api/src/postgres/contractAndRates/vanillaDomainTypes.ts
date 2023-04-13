import { ZodContractFormDataTypeVCurrent, ZodDraftContractFormDataType } from "./zodDomainTypes"

interface ContractRevision {
    id: string
    contractID: string
    submittedAt: Date

    formData: ZodContractFormDataTypeVCurrent
}

interface DraftContractRevision {
    id: string
    contractID: string

    formData: ZodDraftContractFormDataType
}

export type {
    ContractRevision,
    DraftContractRevision,
}
