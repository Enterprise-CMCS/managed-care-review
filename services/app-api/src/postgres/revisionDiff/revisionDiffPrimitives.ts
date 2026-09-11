import type {
    RevisionDiffDocumentListChanges,
    RevisionDiffCollectionItemChange,
    RevisionDiffContactChange,
    RevisionDiffFieldChange,
} from '../../domain-models'
import type { DocumentType } from '../../domain-models/contractAndRates'
import { z } from 'zod'

type ScalarDiffFieldConfig<TItem, TContext> = {
    fieldPath: string
    getValue: (item: TItem, context: TContext) => unknown | Error
}

function areRevisionDiffValuesEqual(left: unknown, right: unknown): boolean {
    if (left instanceof Date && right instanceof Date) {
        return left.getTime() === right.getTime()
    }

    if (Array.isArray(left) && Array.isArray(right)) {
        return (
            left.length === right.length &&
            left.every((leftItem, index) => leftItem === right[index])
        )
    }

    return Object.is(left, right)
}

function buildScalarFieldDiffChanges<TItem, TContext>(
    previous: TItem,
    current: TItem,
    fieldConfigs: ScalarDiffFieldConfig<TItem, TContext>[],
    context: TContext
): RevisionDiffFieldChange[] | Error {
    const changes: RevisionDiffFieldChange[] = []

    for (const fieldConfig of fieldConfigs) {
        const oldValue = fieldConfig.getValue(previous, context)
        if (oldValue instanceof Error) {
            return oldValue
        }

        const newValue = fieldConfig.getValue(current, context)
        if (newValue instanceof Error) {
            return newValue
        }

        if (areRevisionDiffValuesEqual(oldValue, newValue)) {
            continue
        }

        changes.push({
            fieldPath: fieldConfig.fieldPath,
            oldValue,
            newValue,
        })
    }

    return changes
}

type DiffByKeyArgs<TItem, TChange> = {
    previous: TItem[]
    current: TItem[]
    getKey: (item: TItem) => string
    buildChanges: (previous: TItem, current: TItem) => TChange[] | Error
}

function mapItemsByKey<TItem>(
    items: TItem[],
    getKey: (item: TItem) => string
): Map<string, TItem> | Error {
    const itemsByKey = new Map<string, TItem>()

    for (const item of items) {
        const key = getKey(item)

        if (itemsByKey.has(key)) {
            return new Error(
                `Duplicate diff key "${key}" encountered while building keyed revision diff`
            )
        }

        itemsByKey.set(key, item)
    }

    return itemsByKey
}

function diffCollectionByKey<TItem, TChange>({
    previous,
    current,
    getKey,
    buildChanges,
}: DiffByKeyArgs<TItem, TChange>):
    RevisionDiffCollectionItemChange<TItem, TChange>[] | Error {
    const previousItemsByKey = mapItemsByKey(previous, getKey)
    if (previousItemsByKey instanceof Error) {
        return previousItemsByKey
    }

    const currentItemsByKey = mapItemsByKey(current, getKey)
    if (currentItemsByKey instanceof Error) {
        return currentItemsByKey
    }

    const changes: RevisionDiffCollectionItemChange<TItem, TChange>[] = []

    for (const [key, previousItem] of previousItemsByKey) {
        const currentItem = currentItemsByKey.get(key)

        if (!currentItem) {
            changes.push({
                changeType: 'REMOVED',
                key,
                previous: previousItem,
            })
            continue
        }

        const itemChanges = buildChanges(previousItem, currentItem)
        if (itemChanges instanceof Error) {
            return itemChanges
        }

        if (itemChanges.length > 0) {
            changes.push({
                changeType: 'UPDATED',
                key,
                previous: previousItem,
                current: currentItem,
                changes: itemChanges,
            })
        }
    }

    for (const [key, currentItem] of currentItemsByKey) {
        if (previousItemsByKey.has(key)) {
            continue
        }

        changes.push({
            changeType: 'ADDED',
            key,
            current: currentItem,
        })
    }

    return changes
}

function buildContactCollectionChanges<TItem>(
    previous: TItem[],
    current: TItem[],
    getComparisonKey: (item: TItem) => string,
    getIdentityValues: (item: TItem) => (string | undefined)[]
): RevisionDiffContactChange<TItem>[] {
    // Contacts have no stable identity, so changes are found in two passes.
    // Pass 1: a contact whose exact content appears anywhere in the previous
    // list is unchanged, so removals and reorders never flag other contacts.
    const previousCounts = new Map<string, number>()
    for (const item of previous) {
        const key = getComparisonKey(item)
        previousCounts.set(key, (previousCounts.get(key) ?? 0) + 1)
    }

    const leftoverCurrent: { item: TItem; index: number }[] = []
    current.forEach((item, index) => {
        const key = getComparisonKey(item)
        const remaining = previousCounts.get(key) ?? 0

        if (remaining > 0) {
            previousCounts.set(key, remaining - 1)
        } else {
            leftoverCurrent.push({ item, index })
        }
    })

    const leftoverPrevious: TItem[] = []
    for (const item of previous) {
        const key = getComparisonKey(item)
        const remaining = previousCounts.get(key) ?? 0

        if (remaining > 0) {
            previousCounts.set(key, remaining - 1)
            leftoverPrevious.push(item)
        }
    }

    // Pass 2: a leftover current contact sharing an identity value (name or
    // email) with a leftover previous contact is that contact edited, one
    // with no identity link to the previous list is new.
    const changes: RevisionDiffContactChange<TItem>[] = []
    for (const { item, index } of leftoverCurrent) {
        const identityValues = getIdentityValues(item).filter(Boolean)
        const editedPreviousIndex = leftoverPrevious.findIndex((previousItem) =>
            getIdentityValues(previousItem).some(
                (value) => value && identityValues.includes(value)
            )
        )

        if (editedPreviousIndex !== -1) {
            leftoverPrevious.splice(editedPreviousIndex, 1)
            changes.push({
                changeType: 'UPDATED',
                index,
                current: item,
            })
        } else {
            changes.push({
                changeType: 'ADDED',
                index,
                current: item,
            })
        }
    }

    return changes
}

function buildDocumentListChanges(
    previous: DocumentType[],
    current: DocumentType[]
): RevisionDiffDocumentListChanges | Error {
    const changes = diffCollectionByKey({
        previous,
        current,
        getKey: (document) => `${document.sha256}::${document.name}`,
        buildChanges: () => [],
    })

    if (changes instanceof Error) {
        return changes
    }

    const added: string[] = []
    const removed: string[] = []

    for (const change of changes) {
        if (change.changeType === 'ADDED' && 'current' in change) {
            added.push(change.current.name)
        } else if (change.changeType === 'REMOVED' && 'previous' in change) {
            removed.push(change.previous.name)
        }
    }

    return {
        added,
        removed,
    }
}

function hasDocumentListChanges(
    changes: RevisionDiffDocumentListChanges
): boolean {
    return changes.added.length > 0 || changes.removed.length > 0
}

function unwrapSchema(schema: z.core.$ZodType): z.core.$ZodType {
    if (
        schema instanceof z.ZodOptional ||
        schema instanceof z.ZodNullable ||
        schema instanceof z.ZodDefault
    ) {
        return unwrapSchema(schema.unwrap())
    }

    if (schema instanceof z.ZodPipe) {
        return unwrapSchema(schema.def.out)
    }

    return schema
}

function isStringEnumLikeSchema(schema: z.core.$ZodType): boolean {
    if (
        schema instanceof z.ZodString ||
        schema instanceof z.ZodEnum ||
        schema instanceof z.ZodLiteral
    ) {
        return true
    }

    if (schema instanceof z.ZodUnion) {
        return schema.options.every((option) => option instanceof z.ZodLiteral)
    }

    const zodInternal =
        '_zod' in schema && schema._zod && typeof schema._zod === 'object'
            ? schema._zod
            : undefined
    const values =
        zodInternal && 'values' in zodInternal ? zodInternal.values : undefined

    if (values instanceof Set) {
        return [...values].every((value) => typeof value === 'string')
    }

    return false
}

export type { ScalarDiffFieldConfig }
export {
    buildDocumentListChanges,
    buildContactCollectionChanges,
    buildScalarFieldDiffChanges,
    diffCollectionByKey,
    hasDocumentListChanges,
    isStringEnumLikeSchema,
    unwrapSchema,
}
