import type {
    ActuaryContactType,
    RevisionDiffFieldChange,
    RevisionDiffRateActuaryContactChange,
} from '../../domain-models'
import {
    buildScalarFieldDiffChanges,
    type ScalarDiffFieldConfig,
} from './revisionDiffPrimitives'

type ActuaryContactFieldConfig = ScalarDiffFieldConfig<ActuaryContactType, void>

const actuaryContactFieldConfigs: ActuaryContactFieldConfig[] = [
    {
        fieldPath: 'name',
        getValue: (contact) => contact.name,
    },
    {
        fieldPath: 'titleRole',
        getValue: (contact) => contact.titleRole,
    },
    {
        fieldPath: 'email',
        getValue: (contact) => contact.email,
    },
    {
        fieldPath: 'actuarialFirm',
        getValue: (contact) => contact.actuarialFirm,
    },
    {
        fieldPath: 'actuarialFirmOther',
        getValue: (contact) => contact.actuarialFirmOther,
    },
]

function buildActuaryContactFieldChanges(
    previous: ActuaryContactType,
    current: ActuaryContactType
): RevisionDiffFieldChange[] | Error {
    return buildScalarFieldDiffChanges(
        previous,
        current,
        actuaryContactFieldConfigs,
        undefined
    )
}

function buildCertifyingActuaryContactDiffChanges(
    previous: ActuaryContactType[],
    current: ActuaryContactType[]
): RevisionDiffRateActuaryContactChange[] | Error {
    const changes: RevisionDiffRateActuaryContactChange[] = []

    for (const [index, currentContact] of current.entries()) {
        const previousContact = previous[index]

        if (!previousContact) {
            changes.push({
                kind: 'new_or_modified',
                current: currentContact,
                certifyingActuaryContactFieldChanges: [],
            })
            continue
        }

        const fieldChanges = buildActuaryContactFieldChanges(
            previousContact,
            currentContact
        )

        if (fieldChanges instanceof Error) {
            return fieldChanges
        }

        if (fieldChanges.length === 0) {
            continue
        }

        changes.push({
            kind: 'new_or_modified',
            current: currentContact,
            certifyingActuaryContactFieldChanges: fieldChanges,
        })
    }

    return changes
}

export { buildCertifyingActuaryContactDiffChanges }
