import { packageName } from '@mc-review/submissions'
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
    dataValue: (
        formData: ContractFormData,
        context: FieldContext
    ) => string | null | Error
}

const formatProgramNames = (
    programIDs: string[],
    statePrograms: ProgramType[]
): string | Error | null => {
    if (!programIDs.length) {
        return null
    }

    const names = [...programIDs].sort().map((programID) => {
        const program = statePrograms.find((stateProgram) => {
            return stateProgram.id === programID
        })

        if (!program) {
            return new Error(`Could not find state program ${programID}`)
        }

        return program.name
    })

    const missingProgramError = names.find((nameOrError) => {
        return nameOrError instanceof Error
    })

    if (missingProgramError instanceof Error) {
        return missingProgramError
    }

    return (names as string[]).join(', ')
}

const formatSubmissionID = (
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

const formatStringArray = <TKey extends string>(
    values: TKey[]
): string | null => {
    if (!values.length) {
        return null
    }

    return values.join(', ')
}

function unwrapSchema(schema: z.core.$ZodType): z.core.$ZodType {
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
        dataValue: (formData) => {
            const value = formData[fieldPath] as boolean | null
            if (value === undefined || value === null) {
                return null
            }

            return value ? 'true' : 'false'
        },
    }
}

function buildStringFieldConfig(
    fieldPath: keyof ContractFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        dataValue: (formData) => (formData[fieldPath] as string) || null,
    }
}

function buildDateFieldConfig(
    fieldPath: keyof ContractFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        dataValue: (formData) => {
            const value = formData[fieldPath] as Date | null
            return value ? value.toISOString() : null
        },
    }
}

const fieldConfigOverrides: Partial<
    Record<keyof ContractFormData, DiffFieldConfig>
> = {
    populationCovered: {
        fieldPath: 'populationCovered',
        dataValue: (formData) => formData.populationCovered ?? null,
    },
    submissionType: {
        fieldPath: 'submissionType',
        dataValue: (formData) => formData.submissionType,
    },
    contractType: {
        fieldPath: 'contractType',
        dataValue: (formData) => formData.contractType,
    },
    programIDs: {
        fieldPath: 'programIDs',
        dataValue: (formData, context) =>
            formatProgramNames(formData.programIDs, context.statePrograms),
    },
    contractExecutionStatus: {
        fieldPath: 'contractExecutionStatus',
        dataValue: (formData) => formData.contractExecutionStatus ?? null,
    },
    managedCareEntities: {
        fieldPath: 'managedCareEntities',
        dataValue: (formData) =>
            formatStringArray(formData.managedCareEntities),
    },
    federalAuthorities: {
        fieldPath: 'federalAuthorities',
        dataValue: (formData) => formatStringArray(formData.federalAuthorities),
    },
}

const excludedFieldPaths = new Set<keyof ContractFormData>([
    'stateContacts',
    'supportingDocuments',
    'contractDocuments',
])

const diffFieldConfigs: DiffFieldConfig[] = Object.entries(
    contractFormDataSchema.shape as Record<string, z.core.$ZodType>
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
    const olderSubmissionID = formatSubmissionID(olderSubmission, statePrograms)
    if (olderSubmissionID instanceof Error) {
        return olderSubmissionID
    }

    const newerSubmissionID = formatSubmissionID(newerSubmission, statePrograms)
    if (newerSubmissionID instanceof Error) {
        return newerSubmissionID
    }

    const fieldConfigs: ScalarDiffFieldConfig<
        ContractFormData,
        FieldContext
    >[] = diffFieldConfigs.map((fieldConfig) => ({
        fieldPath: fieldConfig.fieldPath,
        getValue: fieldConfig.dataValue,
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
