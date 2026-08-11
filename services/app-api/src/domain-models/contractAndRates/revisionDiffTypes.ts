import type { ActuaryContactType, StateContactType } from './formDataTypes'

type RevisionDiffFieldChange<TValue = unknown> = {
    fieldPath: string
    oldValue: TValue
    newValue: TValue
}

type RevisionDiffCollectionItemAdded<TItem> = {
    changeType: 'ADDED'
    key: string
    current: TItem
}

type RevisionDiffCollectionItemRemoved<TItem> = {
    changeType: 'REMOVED'
    key: string
    previous: TItem
}

type RevisionDiffCollectionItemUpdated<TItem, TChange> = {
    changeType: 'UPDATED'
    key: string
    previous: TItem
    current: TItem
    changes: TChange[]
}

type RevisionDiffCollectionItemChange<TItem, TChange> =
    | RevisionDiffCollectionItemAdded<TItem>
    | RevisionDiffCollectionItemRemoved<TItem>
    | RevisionDiffCollectionItemUpdated<TItem, TChange>

type RevisionDiffCollectionItemNewOrModified<TItem> = {
    changeType: 'NEW_OR_MODIFIED'
    current: TItem
}

type RevisionDiffRateActuaryContactChange =
    RevisionDiffCollectionItemNewOrModified<ActuaryContactType>

type RevisionDiffDocumentListChanges = {
    added: string[]
    removed: string[]
}

type RevisionDiffRateDocumentChanges = {
    rateID: string
    rateCertificationName?: string
    rateDocuments: RevisionDiffDocumentListChanges
    supportingDocuments: RevisionDiffDocumentListChanges
}

type RevisionDiffDocumentChanges = {
    contractDocuments: RevisionDiffDocumentListChanges
    contractSupportingDocuments: RevisionDiffDocumentListChanges
    ratesDocuments: RevisionDiffRateDocumentChanges[]
    totalAdded: number
    totalRemoved: number
}

type RevisionDiffAddedRate = {
    rateID: string
    rateCertificationName?: string
    includedInAnotherSubmission: boolean
}

type RevisionDiffRemovedRate = {
    rateID: string
    rateCertificationName?: string
}

type RevisionDiffRevisedRate = {
    rateID: string
    rateCertificationName?: string
    fieldChanges: RevisionDiffFieldChange[]
    rateDocuments: RevisionDiffDocumentListChanges
    supportingRateDocuments: RevisionDiffDocumentListChanges
    certifyingActuaryContactChanges: RevisionDiffRateActuaryContactChange[]
    addtlActuaryContactChanges: RevisionDiffRateActuaryContactChange[]
}

type RevisionDiffRateChanges = {
    added: RevisionDiffAddedRate[]
    removed: RevisionDiffRemovedRate[]
    revised: RevisionDiffRevisedRate[]
}

type RevisionDiff<TValue = unknown> = {
    contractID: string
    olderRevisionID: string
    newerRevisionID: string
    olderSubmittedAt: Date
    newerSubmittedAt: Date
    fieldChanges: RevisionDiffFieldChange<TValue>[]
    stateContactChanges: RevisionDiffCollectionItemNewOrModified<StateContactType>[]
    documentChanges: RevisionDiffDocumentChanges
    rateChanges: RevisionDiffRateChanges
}

export type {
    RevisionDiff,
    RevisionDiffFieldChange,
    RevisionDiffCollectionItemChange,
    RevisionDiffCollectionItemNewOrModified,
    RevisionDiffRateActuaryContactChange,
    RevisionDiffDocumentListChanges,
    RevisionDiffRateDocumentChanges,
    RevisionDiffDocumentChanges,
    RevisionDiffAddedRate,
    RevisionDiffRemovedRate,
    RevisionDiffRevisedRate,
    RevisionDiffRateChanges,
}
