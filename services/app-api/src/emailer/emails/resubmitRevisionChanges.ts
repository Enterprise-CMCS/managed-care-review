import { formatCalendarDate } from '@mc-review/dates'
import type {
    ProgramType,
    RevisionDiff,
    RevisionDiffFieldChange,
} from '../../domain-models'

type ResubmitRevisionChangeRow = {
    label: string
    oldValue: string
    newValue: string
}

type ResubmitRevisionChangeSection = {
    title: string
    rows: ResubmitRevisionChangeRow[]
}

type ResubmitRevisionChanges = {
    previousSubmissionDate: string
    currentSubmissionDate: string
    hasChanges: boolean
    sections: ResubmitRevisionChangeSection[]
}

const EMAIL_TIMEZONE = 'America/Los_Angeles'

type SubmissionTypeFieldPath =
    | 'contractName'
    | 'populationCovered'
    | 'submissionType'
    | 'contractType'
    | 'riskBasedContract'
    | 'programIDs'
    | 'submissionDescription'

type SubmissionTypeValue = 'CONTRACT_ONLY' | 'CONTRACT_AND_RATES'
type PopulationCoveredValue = 'MEDICAID' | 'CHIP' | 'MEDICAID_AND_CHIP'
type ContractActionTypeValue = 'BASE' | 'AMENDMENT'

const submissionTypeValueRecord: Record<SubmissionTypeValue, string> = {
    CONTRACT_ONLY: 'Contract only',
    CONTRACT_AND_RATES: 'Contract and rate(s)',
}

const populationCoveredValueRecord: Record<PopulationCoveredValue, string> = {
    MEDICAID: 'Medicaid',
    CHIP: 'CHIP',
    MEDICAID_AND_CHIP: 'Medicaid and CHIP',
}

const contractActionTypeValueRecord: Record<ContractActionTypeValue, string> = {
    BASE: 'Base',
    AMENDMENT: 'Amendment',
}

const formatBooleanValue = (value: unknown): string | undefined => {
    if (value === true) {
        return 'Yes'
    }

    if (value === false) {
        return 'No'
    }

    return undefined
}

const formatProgramsValue = (
    value: unknown,
    statePrograms: ProgramType[]
): string | undefined => {
    if (!Array.isArray(value)) {
        return undefined
    }

    const names = value
        .map((programID) =>
            statePrograms.find((program) => program.id === String(programID))
        )
        .filter((program): program is ProgramType => Boolean(program))
        .map((program) => program.name)

    return names.length > 0 ? names.join(', ') : undefined
}

const formatFieldValue = (
    fieldPath: SubmissionTypeFieldPath,
    value: unknown,
    statePrograms: ProgramType[]
): string | undefined => {
    if (typeof value === 'string') {
        if (fieldPath === 'contractName') {
            return value
        }

        if (fieldPath === 'populationCovered') {
            return populationCoveredValueRecord[value as PopulationCoveredValue]
        }

        if (fieldPath === 'submissionType') {
            return submissionTypeValueRecord[value as SubmissionTypeValue]
        }

        if (fieldPath === 'contractType') {
            return contractActionTypeValueRecord[
                value as ContractActionTypeValue
            ]
        }

        if (fieldPath === 'submissionDescription') {
            return value
        }
    }

    if (fieldPath === 'riskBasedContract') {
        return formatBooleanValue(value)
    }

    if (fieldPath === 'programIDs') {
        return formatProgramsValue(value, statePrograms)
    }

    return undefined
}

const buildSubmissionTypeRow = (
    fieldChange: RevisionDiffFieldChange,
    statePrograms: ProgramType[]
): ResubmitRevisionChangeRow | undefined => {
    const rowConfig: Record<SubmissionTypeFieldPath, string> = {
        contractName: 'Submission ID',
        populationCovered: 'Medicaid populations',
        submissionType: 'Submission type',
        contractType: 'Contract action type',
        riskBasedContract: 'Risk-based contract',
        programIDs: 'Programs',
        submissionDescription: 'Submission description',
    }

    if (!(fieldChange.fieldPath in rowConfig)) {
        return undefined
    }

    const typedFieldPath = fieldChange.fieldPath as SubmissionTypeFieldPath
    const label = rowConfig[typedFieldPath]

    if (!label) {
        return undefined
    }

    const oldValue = formatFieldValue(
        typedFieldPath,
        fieldChange.oldValue,
        statePrograms
    )
    const newValue = formatFieldValue(
        typedFieldPath,
        fieldChange.newValue,
        statePrograms
    )

    if (!oldValue || !newValue) {
        return undefined
    }

    return {
        label,
        oldValue,
        newValue,
    }
}

const buildResubmitRevisionChanges = (
    comparison: RevisionDiff,
    statePrograms: ProgramType[]
): ResubmitRevisionChanges => {
    const submissionTypeRows = comparison.fieldChanges
        .map((fieldChange) =>
            buildSubmissionTypeRow(fieldChange, statePrograms)
        )
        .filter((row): row is ResubmitRevisionChangeRow => row !== undefined)

    const sections: ResubmitRevisionChangeSection[] =
        submissionTypeRows.length > 0
            ? [
                  {
                      title: 'SUBMISSION TYPE',
                      rows: submissionTypeRows,
                  },
              ]
            : []

    return {
        previousSubmissionDate: formatCalendarDate(
            comparison.olderSubmittedAt,
            EMAIL_TIMEZONE
        ),
        currentSubmissionDate: formatCalendarDate(
            comparison.newerSubmittedAt,
            EMAIL_TIMEZONE
        ),
        hasChanges: comparison.fieldChanges.length > 0,
        sections,
    }
}

export { buildResubmitRevisionChanges, type ResubmitRevisionChanges }
