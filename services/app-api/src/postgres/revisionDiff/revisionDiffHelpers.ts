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
    isStringEnumLikeSchema,
    type ScalarDiffFieldConfig,
    unwrapSchema,
} from './revisionDiffPrimitives'
import { buildDocumentChanges } from './revisionDiffDocuments'
import { buildRateChanges } from './revisionDiffRates'
import { buildStateContactDiffChanges } from './revisionDiffStateContacts'

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
    programIDs: {
        fieldPath: 'programIDs',
        dataValue: (formData) => normalizeProgramIDs(formData.programIDs),
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

    if (isStringEnumLikeSchema(unwrappedSchema)) {
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

/**
 * lists contract form fields that are not already excluded, overridden, or supported by existing auto-diffing.
 * used to test if new contract form fields are added which need to be specifically handled in the revision diff logic.
 */
function getUnhandledContractDiffFieldPaths(): string[] {
    return Object.entries(
        contractFormDataSchema.shape as Record<string, z.core.$ZodType>
    ).flatMap(([fieldPath, schema]) => {
        const typedFieldPath = fieldPath as keyof ContractFormData & string

        if (excludedFieldPaths.has(typedFieldPath)) {
            return []
        }

        if (fieldConfigOverrides[typedFieldPath]) {
            return []
        }

        const unwrappedSchema = unwrapSchema(schema)

        if (
            unwrappedSchema instanceof z.ZodBoolean ||
            isStringEnumLikeSchema(unwrappedSchema) ||
            unwrappedSchema instanceof z.ZodDate ||
            unwrappedSchema instanceof z.ZodArray
        ) {
            return []
        }

        return [fieldPath]
    })
}

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
    statePrograms: ProgramType[],
    linkedRateIDs: Set<string>
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

    const stateContactChanges = buildStateContactDiffChanges(
        olderSubmission.contractRevision.formData.stateContacts,
        newerSubmission.contractRevision.formData.stateContacts
    )

    const rateChanges = buildRateChanges(
        olderSubmission,
        newerSubmission,
        linkedRateIDs
    )
    if (rateChanges instanceof Error) {
        return rateChanges
    }

    const documentChanges = buildDocumentChanges(
        olderSubmission,
        newerSubmission,
        rateChanges.added,
        rateChanges.removed,
        rateChanges.revised
    )
    if (documentChanges instanceof Error) {
        return documentChanges
    }

    return {
        contractID,
        olderRevisionID: olderSubmission.contractRevision.id,
        newerRevisionID: newerSubmission.contractRevision.id,
        olderSubmittedAt: olderSubmission.submitInfo.updatedAt,
        newerSubmittedAt: newerSubmission.submitInfo.updatedAt,
        fieldChanges: [...contractNameChange, ...fieldChanges],
        stateContactChanges,
        documentChanges,
        rateChanges,
    }
}

export { buildRevisionDiff, getUnhandledContractDiffFieldPaths }
