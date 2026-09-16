import type { StateContactType } from '../../domain-models/contractAndRates'
import { buildContactCollectionChanges } from './revisionDiffPrimitives'

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
    return buildContactCollectionChanges(
        previous,
        current,
        buildStateContactComparisonKey,
        (contact) => [contact.name, contact.email]
    )
}

export { buildStateContactDiffChanges }
