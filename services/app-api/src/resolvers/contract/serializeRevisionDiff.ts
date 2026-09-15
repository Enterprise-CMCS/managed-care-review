import type { RevisionDiff } from '../../domain-models'

function serializeRevisionDiffFieldValue(value: unknown):
    | {
          valueType: 'STRING'
          value: string
      }
    | {
          valueType: 'BOOLEAN'
          value: boolean
      }
    | {
          valueType: 'DATE'
          value: Date
      }
    | {
          valueType: 'STRING_ARRAY'
          value: string[]
      }
    | undefined {
    if (value === undefined || value === null) {
        return undefined
    }

    if (value instanceof Date) {
        return {
            valueType: 'DATE',
            value,
        }
    }

    if (Array.isArray(value)) {
        return {
            valueType: 'STRING_ARRAY',
            value: value.map((item) => String(item)),
        }
    }

    if (typeof value === 'boolean') {
        return {
            valueType: 'BOOLEAN',
            value,
        }
    }

    return {
        valueType: 'STRING',
        value: String(value),
    }
}

function serializeRevisionDiffFieldChanges(
    fieldChanges: RevisionDiff['fieldChanges']
) {
    return fieldChanges.map((fieldChange) => ({
        ...fieldChange,
        oldValue: serializeRevisionDiffFieldValue(fieldChange.oldValue),
        newValue: serializeRevisionDiffFieldValue(fieldChange.newValue),
    }))
}

function serializeRevisionDiffForGraphQL(comparison: RevisionDiff) {
    const serializeRevisionDiffActuaryContact = (
        contact: RevisionDiff['rateChanges']['revised'][number]['certifyingActuaryContactChanges'][number]['current']
    ) => ({
        name: contact.name,
        titleRole: contact.titleRole,
        email: contact.email,
        actuarialFirm:
            contact.actuarialFirm === 'OTHER'
                ? (contact.actuarialFirmOther ?? null)
                : (contact.actuarialFirm ?? null),
    })

    return {
        ...comparison,
        fieldChanges: serializeRevisionDiffFieldChanges(
            comparison.fieldChanges
        ),
        rateChanges: {
            ...comparison.rateChanges,
            revised: comparison.rateChanges.revised.map((rate) => ({
                ...rate,
                fieldChanges: serializeRevisionDiffFieldChanges(
                    rate.fieldChanges
                ),
                certifyingActuaryContactChanges:
                    rate.certifyingActuaryContactChanges.map((change) => ({
                        ...change,
                        current: serializeRevisionDiffActuaryContact(
                            change.current
                        ),
                    })),
                addtlActuaryContactChanges: rate.addtlActuaryContactChanges.map(
                    (change) => ({
                        ...change,
                        current: serializeRevisionDiffActuaryContact(
                            change.current
                        ),
                    })
                ),
            })),
        },
    }
}

export { serializeRevisionDiffForGraphQL }
