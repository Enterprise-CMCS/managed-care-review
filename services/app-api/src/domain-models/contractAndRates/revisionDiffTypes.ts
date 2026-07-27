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
    rates: RevisionDiffRateDocumentChanges[]
    totalAdded: number
    totalRemoved: number
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
}

export type {
    RevisionDiff,
    RevisionDiffFieldChange,
    RevisionDiffCollectionItemChange,
    RevisionDiffCollectionItemNewOrModified,
    RevisionDiffDocumentNameChanges,
    RevisionDiffRateDocumentChanges,
    RevisionDiffDocumentChanges,
}
