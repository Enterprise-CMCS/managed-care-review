import {
    ContractTypeRecord,
    PopulationCoveredRecord,
    SubmissionTypeRecord,
} from '@mc-review/submissions'
import type {
    ContractPackageSubmissionType,
    ProgramType,
    RevisionDiff,
} from '../../domain-models'
import {
    buildScalarFieldDiffChanges,
    type ScalarDiffFieldConfig,
} from './revisionDiffPrimitives'

type FieldContext = {
    statePrograms: ProgramType[]
}

type DiffFieldConfig = {
    fieldPath: string
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
        fieldPath: 'populationCovered',
        displayValue: (formData) =>
            formData.populationCovered
                ? PopulationCoveredRecord[formData.populationCovered]
                : null,
    },
    {
        fieldPath: 'submissionType',
        displayValue: (formData) =>
            SubmissionTypeRecord[formData.submissionType],
    },
    {
        fieldPath: 'contractType',
        displayValue: (formData) => ContractTypeRecord[formData.contractType],
    },
    {
        fieldPath: 'riskBasedContract',
        displayValue: (formData) =>
            displayBooleanAsYesNo(formData.riskBasedContract),
    },
    {
        fieldPath: 'programIDs',
        displayValue: (formData, context) =>
            displayPrograms(formData.programIDs, context.statePrograms),
    },
    {
        fieldPath: 'submissionDescription',
        displayValue: (formData) => formData.submissionDescription || null,
    },
]

function buildRevisionDiff(
    contractID: string,
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType,
    statePrograms: ProgramType[]
): RevisionDiff | Error {
    const fieldConfigs: ScalarDiffFieldConfig<
        ContractPackageSubmissionType['contractRevision']['formData'],
        FieldContext
    >[] = diffFieldConfigs.map((fieldConfig) => ({
        fieldPath: fieldConfig.fieldPath,
        getValue: fieldConfig.displayValue,
    }))

    const fieldChanges = buildScalarFieldDiffChanges(
        olderSubmission.contractRevision.formData,
        newerSubmission.contractRevision.formData,
        fieldConfigs,
        {
            statePrograms,
        }
    )
    if (fieldChanges instanceof Error) {
        return fieldChanges
    }

    return {
        contractID,
        olderRevisionID: olderSubmission.contractRevision.id,
        newerRevisionID: newerSubmission.contractRevision.id,
        olderSubmittedAt: olderSubmission.submitInfo.updatedAt,
        newerSubmittedAt: newerSubmission.submitInfo.updatedAt,
        fieldChanges,
    }
}

export { buildRevisionDiff }
