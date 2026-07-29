import type { StateContactType } from './formDataTypes'

type RevisionDiffFieldChange<TValue = unknown> = {
    fieldPath: string
    oldValue: TValue
    newValue: TValue
}

type RevisionDiffCollectionItemAdded<TItem> = {
    kind: 'added'
    key: string
    current: TItem
}

type RevisionDiffCollectionItemRemoved<TItem> = {
    kind: 'removed'
    key: string
    previous: TItem
}

type RevisionDiffCollectionItemUpdated<TItem, TChange> = {
    kind: 'updated'
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
    kind: 'new_or_modified'
    current: TItem
}

type RevisionDiffDocumentNameChanges = {
    added: string[]
    removed: string[]
}

type RevisionDiffRateDocumentChanges = {
    rateID: string
    rateCertificationName: string
    rateDocuments: RevisionDiffDocumentNameChanges
    supportingDocuments: RevisionDiffDocumentNameChanges
}

type RevisionDiffDocumentChanges = {
    contractDocuments: RevisionDiffDocumentNameChanges
    contractSupportingDocuments: RevisionDiffDocumentNameChanges
    ratesDocuments: RevisionDiffRateDocumentChanges[]
    totalAdded: number
    totalRemoved: number
}

type RevisionDiffAddedRate = {
    rateID: string
    rateCertificationName: string
    includedInAnotherSubmission: boolean
}

type RevisionDiffRemovedRate = {
    rateID: string
    rateCertificationName: string
}

type RevisionDiffRevisedRate = {
    rateID: string
    rateCertificationName: string
    fieldChanges: RevisionDiffFieldChange[]
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
    RevisionDiffDocumentNameChanges,
    RevisionDiffRateDocumentChanges,
    RevisionDiffDocumentChanges,
    RevisionDiffAddedRate,
    RevisionDiffRemovedRate,
    RevisionDiffRevisedRate,
    RevisionDiffRateChanges,
}
