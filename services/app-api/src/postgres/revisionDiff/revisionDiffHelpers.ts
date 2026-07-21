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

/**
 * Resolves program ids into a comma-joined list of program abbreviations.
 */
const formatProgramNames = (
    programIDs: string[],
    statePrograms: ProgramType[]
): string | Error | null => {
    if (!programIDs.length) {
        return null
    }

    const programNames: string[] = []

    for (const programID of [...programIDs].sort()) {
        const program = statePrograms.find((stateProgram) => {
            return stateProgram.id === programID
        })

        if (!program) {
            return new Error(`Could not find state program ${programID}`)
        }

        programNames.push(program.name)
    }

    return programNames.join(', ')
}

/**
 * Builds the derived contract name used for a submitted revision.
 */
const buildContractName = (
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

/**
 * Serializes an array of domain values into a comma-joined diff value.
 */
const formatStringArray = <TKey extends string>(
    values: TKey[]
): string | null => {
    if (!values.length) {
        return null
    }

    return values.join(', ')
}

/**
 * Peels off wrapper schemas so field inference can inspect the underlying scalar type.
 */
function unwrapSchema(schema: z.core.$ZodType): z.core.$ZodType {
    if (
        schema instanceof z.ZodOptional ||
        schema instanceof z.ZodNullable ||
        schema instanceof z.ZodDefault
    ) {
        return unwrapSchema(schema.unwrap())
    }

    if (schema instanceof z.ZodPipe) {
        return unwrapSchema(schema.def.out)
    }

    return schema
}

/**
 * Creates a diff config for boolean contract form fields.
 */
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

/**
 * Creates a diff config for string contract form fields.
 */
function buildStringFieldConfig(
    fieldPath: keyof ContractFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        dataValue: (formData) => (formData[fieldPath] as string) || null,
    }
}

/**
 * Creates a diff config for date contract form fields using ISO serialization.
 */
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

const diffContractFormDataFieldConfigs: DiffFieldConfig[] = Object.entries(
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

const scalarContractFormDataFieldConfigs: ScalarDiffFieldConfig<
    ContractFormData,
    FieldContext
>[] = diffContractFormDataFieldConfigs.map((fieldConfig) => ({
    fieldPath: fieldConfig.fieldPath,
    getValue: fieldConfig.dataValue,
}))

/**
 * Compares two submitted contract revisions and returns a data-only diff payload.
 */
function buildRevisionDiff(
    contractID: string,
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType,
    statePrograms: ProgramType[]
): RevisionDiff | Error {
    const olderContractName = buildContractName(olderSubmission, statePrograms)
    if (olderContractName instanceof Error) {
        return olderContractName
    }

    const newerContractName = buildContractName(newerSubmission, statePrograms)
    if (newerContractName instanceof Error) {
        return newerContractName
    }

    const fieldChanges = buildScalarFieldDiffChanges(
        olderSubmission.contractRevision.formData,
        newerSubmission.contractRevision.formData,
        scalarContractFormDataFieldConfigs,
        {
            statePrograms,
        }
    )
    if (fieldChanges instanceof Error) {
        return fieldChanges
    }

    const contractNameChange =
        olderContractName === newerContractName
            ? []
            : [
                  {
                      fieldPath: 'contractName',
                      oldValue: olderContractName,
                      newValue: newerContractName,
                  },
              ]

    return {
        contractID,
        olderRevisionID: olderSubmission.contractRevision.id,
        newerRevisionID: newerSubmission.contractRevision.id,
        olderSubmittedAt: olderSubmission.submitInfo.updatedAt,
        newerSubmittedAt: newerSubmission.submitInfo.updatedAt,
        fieldChanges: [...contractNameChange, ...fieldChanges],
    }
}

export { buildRevisionDiff }
