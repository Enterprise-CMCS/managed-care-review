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

type RevisionDiff<TValue = unknown> = {
    contractID: string
    olderRevisionID: string
    newerRevisionID: string
    olderSubmittedAt: Date
    newerSubmittedAt: Date
    fieldChanges: RevisionDiffFieldChange<TValue>[]
    stateContactChanges: RevisionDiffCollectionItemNewOrModified<StateContactType>[]
}

export type {
    RevisionDiff,
    RevisionDiffFieldChange,
    RevisionDiffCollectionItemChange,
    RevisionDiffCollectionItemNewOrModified,
}
