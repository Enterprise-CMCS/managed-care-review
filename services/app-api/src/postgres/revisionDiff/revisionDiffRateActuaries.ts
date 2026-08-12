import type {
    ActuaryContactType,
    RevisionDiffRateActuaryContactChange,
} from '../../domain-models'
import { buildNewAndModifiedCollectionChanges } from './revisionDiffPrimitives'

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
    return buildNewAndModifiedCollectionChanges(
        previous,
        current,
        buildActuaryContactComparisonKey
    )
}

export { buildRateActuaryContactDiffChanges }
