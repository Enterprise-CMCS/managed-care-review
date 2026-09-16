import type {
    ActuaryContactType,
    RevisionDiffRateActuaryContactChange,
} from '../../domain-models'
import { buildContactCollectionChanges } from './revisionDiffPrimitives'

function buildActuaryContactComparisonKey(contact: ActuaryContactType): string {
    return JSON.stringify([
        contact.name ?? '',
        contact.titleRole ?? '',
        contact.email ?? '',
        contact.actuarialFirm ?? '',
        contact.actuarialFirmOther ?? '',
    ])
}

function buildRateActuaryContactDiffChanges(
    previous: ActuaryContactType[],
    current: ActuaryContactType[]
): RevisionDiffRateActuaryContactChange[] {
    return buildContactCollectionChanges(
        previous,
        current,
        buildActuaryContactComparisonKey,
        (contact) => [contact.name, contact.email]
    )
}

export { buildRateActuaryContactDiffChanges }
