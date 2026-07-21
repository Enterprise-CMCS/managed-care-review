import type {
    RevisionDiffCollectionItemChange,
    RevisionDiffFieldChange,
} from '../../domain-models'

type ScalarDiffFieldConfig<TItem, TContext> = {
    fieldPath: string
    getValue: (
        item: TItem,
        context: TContext
    ) => RevisionDiffFieldChange['oldValue'] | Error
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

        if (oldValue === newValue) {
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
    | RevisionDiffCollectionItemChange<TItem, TChange>[]
    | Error {
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

export type { ScalarDiffFieldConfig }
export { buildScalarFieldDiffChanges, diffCollectionByKey }
