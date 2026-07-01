import {
    ContractTypeRecord,
    PopulationCoveredRecord,
    SubmissionTypeRecord,
} from '@mc-review/submissions'
import type {
    ContractPackageSubmissionType,
    ProgramType,
    SubmissionDiff,
    SubmissionDiffFieldChange,
    SubmissionDiffSection,
} from '../../domain-models'

type FieldContext = {
    statePrograms: ProgramType[]
}

type DiffFieldConfig = {
    sectionTitle: string
    fieldPath: string
    label: string
    displayValue: (
        formData: ContractPackageSubmissionType['contractRevision']['formData'],
        context: FieldContext
    ) => string | null | Error
}

const displayBooleanAsYesNo = (
    value: boolean | null | undefined
): string | null => {
    if (value === undefined || value === null) {
        return null
    }

    return value ? 'Yes' : 'No'
}

const displayPrograms = (
    programIDs: string[],
    statePrograms: ProgramType[]
): string | Error | null => {
    if (!programIDs.length) {
        return null
    }

    const names = programIDs.map((programID) => {
        const program = statePrograms.find((stateProgram) => {
            return stateProgram.id === programID
        })

        if (!program) {
            return new Error(`Could not find state program ${programID}`)
        }

        return program.fullName ?? program.name
    })

    const missingProgramError = names.find((nameOrError) => {
        return nameOrError instanceof Error
    })

    if (missingProgramError instanceof Error) {
        return missingProgramError
    }

    return (names as string[]).join(', ')
}

const diffFieldConfigs: DiffFieldConfig[] = [
    {
        sectionTitle: 'Submission Type',
        fieldPath: 'populationCovered',
        label: 'Medicaid populations',
        displayValue: (formData) =>
            formData.populationCovered
                ? PopulationCoveredRecord[formData.populationCovered]
                : null,
    },
    {
        sectionTitle: 'Submission Type',
        fieldPath: 'submissionType',
        label: 'Submission type',
        displayValue: (formData) =>
            SubmissionTypeRecord[formData.submissionType],
    },
    {
        sectionTitle: 'Submission Type',
        fieldPath: 'contractType',
        label: 'Contract action type',
        displayValue: (formData) => ContractTypeRecord[formData.contractType],
    },
    {
        sectionTitle: 'Submission Type',
        fieldPath: 'riskBasedContract',
        label: 'Risk-based contract',
        displayValue: (formData) =>
            displayBooleanAsYesNo(formData.riskBasedContract),
    },
    {
        sectionTitle: 'Submission Type',
        fieldPath: 'programIDs',
        label: 'Programs',
        displayValue: (formData, context) =>
            displayPrograms(formData.programIDs, context.statePrograms),
    },
    {
        sectionTitle: 'Submission Type',
        fieldPath: 'submissionDescription',
        label: 'Submission description',
        displayValue: (formData) => formData.submissionDescription || null,
    },
]

function buildSubmissionDiff(
    contractID: string,
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType,
    statePrograms: ProgramType[]
): SubmissionDiff | Error {
    const sectionsByTitle = new Map<string, SubmissionDiffSection>()

    for (const fieldConfig of diffFieldConfigs) {
        const oldValue = fieldConfig.displayValue(
            olderSubmission.contractRevision.formData,
            {
                statePrograms,
            }
        )
        if (oldValue instanceof Error) {
            return oldValue
        }

        const newValue = fieldConfig.displayValue(
            newerSubmission.contractRevision.formData,
            {
                statePrograms,
            }
        )
        if (newValue instanceof Error) {
            return newValue
        }

        if (oldValue === newValue) {
            continue
        }

        const change: SubmissionDiffFieldChange = {
            fieldPath: fieldConfig.fieldPath,
            label: fieldConfig.label,
            oldValue,
            newValue,
        }

        const section = sectionsByTitle.get(fieldConfig.sectionTitle) ?? {
            title: fieldConfig.sectionTitle,
            changes: [],
        }

        section.changes.push(change)
        sectionsByTitle.set(fieldConfig.sectionTitle, section)
    }

    return {
        contractID,
        olderRevisionID: olderSubmission.contractRevision.id,
        newerRevisionID: newerSubmission.contractRevision.id,
        olderSubmittedAt: olderSubmission.submitInfo.updatedAt,
        newerSubmittedAt: newerSubmission.submitInfo.updatedAt,
        sections: [...sectionsByTitle.values()],
    }
}

export { buildSubmissionDiff }
