import { RevisionDiffFragmentFragment } from '../../gen/gqlClient'
import { ChangeTagType } from '../InfoTag'

type RevisionDiffFieldChanges = RevisionDiffFragmentFragment['fieldChanges']
type RevisionDiffFieldValue = RevisionDiffFieldChanges[number]['oldValue']

// A field has no data when its wrapper is absent, its value is empty, or its list is empty.
// Strict equality matters: false and 0 are real data (a provision set to "No" is a change).
const isEmptyDiffValue = (diffValue: RevisionDiffFieldValue): boolean => {
    if (!diffValue) {
        return true
    }
    return (
        diffValue.value === null ||
        diffValue.value === '' ||
        (Array.isArray(diffValue.value) && diffValue.value.length === 0)
    )
}

// NEW when the field had no data on the prior submission, UPDATED when the data changed.
// Fields that lost their data get no tag; they usually no longer display.
const fieldChangeTag = (
    fieldChanges: RevisionDiffFieldChanges | undefined,
    fieldPath: string
): ChangeTagType | undefined => {
    const change = fieldChanges?.find(
        (fieldChange) => fieldChange.fieldPath === fieldPath
    )

    if (!change || isEmptyDiffValue(change.newValue)) {
        return undefined
    }

    return isEmptyDiffValue(change.oldValue) ? 'NEW' : 'UPDATED'
}

// For checkbox-list fields the design tags only the items that were added,
// using the field-level tag (NEW when the whole field is new, otherwise UPDATED).
const changedListItemTags = (
    fieldChanges: RevisionDiffFieldChanges | undefined,
    fieldPath: string
): Partial<Record<string, ChangeTagType>> => {
    const tag = fieldChangeTag(fieldChanges, fieldPath)
    const change = fieldChanges?.find(
        (fieldChange) => fieldChange.fieldPath === fieldPath
    )

    if (!tag || !Array.isArray(change?.newValue?.value)) {
        return {}
    }

    const previousItems = new Set(
        Array.isArray(change.oldValue?.value) ? change.oldValue.value : []
    )

    const itemTags: Partial<Record<string, ChangeTagType>> = {}
    for (const item of change.newValue.value) {
        if (!previousItems.has(item)) {
            itemTags[String(item)] = tag
        }
    }

    return itemTags
}

export { fieldChangeTag, changedListItemTags, isEmptyDiffValue }
