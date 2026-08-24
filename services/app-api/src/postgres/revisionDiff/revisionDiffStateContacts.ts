import type { StateContactType } from '../../domain-models/contractAndRates'
import { buildNewAndModifiedCollectionChanges } from './revisionDiffPrimitives'

function buildStateContactComparisonKey(contact: StateContactType): string {
    return JSON.stringify([
        contact.name ?? '',
        contact.titleRole ?? '',
        contact.email ?? '',
    ])
}

function buildStateContactDiffChanges(
    previous: StateContactType[],
    current: StateContactType[]
) {
    return buildNewAndModifiedCollectionChanges(
        previous,
        current,
        buildStateContactComparisonKey
    )
}

export { buildStateContactDiffChanges }
