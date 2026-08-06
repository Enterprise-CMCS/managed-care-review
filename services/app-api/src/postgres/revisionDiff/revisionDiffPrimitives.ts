import type {
    RevisionDiffCollectionItemChange,
    RevisionDiffCollectionItemNewOrModified,
    RevisionDiffFieldChange,
} from '../../domain-models'
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
                kind: 'removed',
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
                kind: 'updated',
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
            kind: 'added',
            key,
            current: currentItem,
        })
    }

    return changes
}

function buildNewAndModifiedCollectionChanges<TItem>(
    previous: TItem[],
    current: TItem[],
    getComparisonKey: (item: TItem) => string
): RevisionDiffCollectionItemNewOrModified<TItem>[] {
    const previousRemainingCounts = new Map<string, number>()

    for (const item of previous) {
        const key = getComparisonKey(item)
        previousRemainingCounts.set(
            key,
            (previousRemainingCounts.get(key) ?? 0) + 1
        )
    }

    const changes: RevisionDiffCollectionItemNewOrModified<TItem>[] = []

    for (const item of current) {
        const key = getComparisonKey(item)
        const remainingCount = previousRemainingCounts.get(key) ?? 0

        if (remainingCount > 0) {
            previousRemainingCounts.set(key, remainingCount - 1)
            continue
        }

        changes.push({
            kind: 'new_or_modified',
            current: item,
        })
    }

    return changes
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

    return false
}

export type { ScalarDiffFieldConfig }
export {
    buildNewAndModifiedCollectionChanges,
    buildScalarFieldDiffChanges,
    diffCollectionByKey,
    isStringEnumLikeSchema,
    unwrapSchema,
}
