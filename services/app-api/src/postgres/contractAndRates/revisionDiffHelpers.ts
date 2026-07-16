import {
    ContractTypeRecord,
    ContractExecutionStatusRecord,
    FederalAuthorityRecord,
    ManagedCareEntityRecord,
    PopulationCoveredRecord,
    SubmissionTypeRecord,
    packageName,
} from '@mc-review/submissions'
import { formatCalendarDate } from '@mc-review/dates'
import { z } from 'zod'
import type {
    ContractPackageSubmissionType,
    ProgramType,
    RevisionDiff,
} from '../../domain-models'
import { contractFormDataSchema } from '../../domain-models/contractAndRates/formDataTypes'
import {
    buildScalarFieldDiffChanges,
    type ScalarDiffFieldConfig,
} from './revisionDiffPrimitives'

type ContractFormData =
    ContractPackageSubmissionType['contractRevision']['formData']

type FieldContext = {
    statePrograms: ProgramType[]
}

type DiffFieldConfig = {
    fieldPath: string
    displayValue: (
        formData: ContractFormData,
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

const displaySubmissionID = (
    submission: ContractPackageSubmissionType,
    statePrograms: ProgramType[]
): string | Error => {
    return packageName(
        submission.contractRevision.contract.stateCode,
        submission.contractRevision.contract.stateNumber,
        submission.contractRevision.formData.programIDs,
        statePrograms
    )
}

const displayDate = (value: Date | null | undefined): string | null => {
    if (!value) {
        return null
    }

    return formatCalendarDate(value, 'UTC')
}

const displayStringArray = <TKey extends string>(
    values: TKey[],
    record: Record<TKey, string>
): string | null => {
    if (!values.length) {
        return null
    }

    return values.map((value) => record[value]).join(', ')
}

function unwrapSchema(schema: any): z.ZodTypeAny {
    if (
        schema instanceof z.ZodOptional ||
        schema instanceof z.ZodNullable ||
        schema instanceof z.ZodDefault
    ) {
        return unwrapSchema(schema.unwrap())
    }

    if (schema instanceof z.ZodPipe) {
        return unwrapSchema(schema._def.out)
    }

    return schema
}

function buildBooleanFieldConfig(
    fieldPath: keyof ContractFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        displayValue: (formData) =>
            displayBooleanAsYesNo(formData[fieldPath] as boolean | null),
    }
}

function buildStringFieldConfig(
    fieldPath: keyof ContractFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        displayValue: (formData) => (formData[fieldPath] as string) || null,
    }
}

function buildDateFieldConfig(
    fieldPath: keyof ContractFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        displayValue: (formData) =>
            displayDate(formData[fieldPath] as Date | null),
    }
}

const fieldConfigOverrides: Partial<
    Record<keyof ContractFormData, DiffFieldConfig>
> = {
    populationCovered: {
        fieldPath: 'populationCovered',
        displayValue: (formData) =>
            formData.populationCovered
                ? PopulationCoveredRecord[formData.populationCovered]
                : null,
    },
    submissionType: {
        fieldPath: 'submissionType',
        displayValue: (formData) =>
            SubmissionTypeRecord[formData.submissionType],
    },
    contractType: {
        fieldPath: 'contractType',
        displayValue: (formData) => ContractTypeRecord[formData.contractType],
    },
    programIDs: {
        fieldPath: 'programIDs',
        displayValue: (formData, context) =>
            displayPrograms(formData.programIDs, context.statePrograms),
    },
    contractExecutionStatus: {
        fieldPath: 'contractExecutionStatus',
        displayValue: (formData) =>
            formData.contractExecutionStatus
                ? ContractExecutionStatusRecord[
                      formData.contractExecutionStatus
                  ]
                : null,
    },
    managedCareEntities: {
        fieldPath: 'managedCareEntities',
        displayValue: (formData) =>
            displayStringArray(
                formData.managedCareEntities,
                ManagedCareEntityRecord
            ),
    },
    federalAuthorities: {
        fieldPath: 'federalAuthorities',
        displayValue: (formData) =>
            displayStringArray(
                formData.federalAuthorities,
                FederalAuthorityRecord
            ),
    },
}

const excludedFieldPaths = new Set<keyof ContractFormData>([
    'stateContacts',
    'supportingDocuments',
    'contractDocuments',
])

const diffFieldConfigs: DiffFieldConfig[] = Object.entries(
    contractFormDataSchema.shape as Record<string, any>
).flatMap(([fieldPath, schema]) => {
    const typedFieldPath = fieldPath as keyof ContractFormData & string

    if (excludedFieldPaths.has(typedFieldPath)) {
        return []
    }

    const overriddenConfig = fieldConfigOverrides[typedFieldPath]
    if (overriddenConfig) {
        return [overriddenConfig]
    }

    const unwrappedSchema = unwrapSchema(schema)

    if (unwrappedSchema instanceof z.ZodBoolean) {
        return [buildBooleanFieldConfig(typedFieldPath)]
    }

    if (unwrappedSchema instanceof z.ZodString) {
        return [buildStringFieldConfig(typedFieldPath)]
    }

    if (unwrappedSchema instanceof z.ZodDate) {
        return [buildDateFieldConfig(typedFieldPath)]
    }

    return []
})

function buildRevisionDiff(
    contractID: string,
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType,
    statePrograms: ProgramType[]
): RevisionDiff | Error {
    const olderSubmissionID = displaySubmissionID(
        olderSubmission,
        statePrograms
    )
    if (olderSubmissionID instanceof Error) {
        return olderSubmissionID
    }

    const newerSubmissionID = displaySubmissionID(
        newerSubmission,
        statePrograms
    )
    if (newerSubmissionID instanceof Error) {
        return newerSubmissionID
    }

    const fieldConfigs: ScalarDiffFieldConfig<
        ContractFormData,
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

    const submissionIDChange =
        olderSubmissionID === newerSubmissionID
            ? []
            : [
                  {
                      fieldPath: 'submissionID',
                      oldValue: olderSubmissionID,
                      newValue: newerSubmissionID,
                  },
              ]

    return {
        contractID,
        olderRevisionID: olderSubmission.contractRevision.id,
        newerRevisionID: newerSubmission.contractRevision.id,
        olderSubmittedAt: olderSubmission.submitInfo.updatedAt,
        newerSubmittedAt: newerSubmission.submitInfo.updatedAt,
        fieldChanges: [...submissionIDChange, ...fieldChanges],
    }
}

export { buildRevisionDiff }
