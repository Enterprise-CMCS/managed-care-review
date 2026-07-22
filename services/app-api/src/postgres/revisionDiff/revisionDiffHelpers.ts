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
    ) => unknown | Error
}

/**
 * Returns program ids in a stable order so reordering does not create a diff.
 */
const normalizeProgramIDs = (programIDs: string[]): string[] =>
    [...programIDs].sort()

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
 * Returns a shallow copy of an array field so diff output preserves array values.
 */
const cloneArrayValue = <TItem>(values: TItem[]): TItem[] => [...values]

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
        dataValue: (formData) => formData[fieldPath] as boolean | undefined,
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
        dataValue: (formData) => formData[fieldPath] as string | undefined,
    }
}

/**
 * Creates a diff config for date contract form fields.
 */
function buildDateFieldConfig(
    fieldPath: keyof ContractFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        dataValue: (formData) => formData[fieldPath] as Date | undefined,
    }
}

/**
 * Creates a diff config for string-array contract form fields.
 */
function buildStringArrayFieldConfig(
    fieldPath: keyof ContractFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        dataValue: (formData) =>
            cloneArrayValue(formData[fieldPath] as string[]),
    }
}

const fieldConfigOverrides: Partial<
    Record<keyof ContractFormData, DiffFieldConfig>
> = {
    populationCovered: {
        fieldPath: 'populationCovered',
        dataValue: (formData) => formData.populationCovered,
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
        dataValue: (formData) => normalizeProgramIDs(formData.programIDs),
    },
    contractExecutionStatus: {
        fieldPath: 'contractExecutionStatus',
        dataValue: (formData) => formData.contractExecutionStatus,
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

    if (unwrappedSchema instanceof z.ZodArray) {
        return [buildStringArrayFieldConfig(typedFieldPath)]
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
