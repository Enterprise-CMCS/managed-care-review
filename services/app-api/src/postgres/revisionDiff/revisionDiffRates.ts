import type {
    ContractPackageSubmissionType,
    RateFormDataType,
    RateRevisionType,
    RevisionDiffAddedRate,
    RevisionDiffRateChanges,
    RevisionDiffRemovedRate,
    RevisionDiffRevisedRate,
} from '../../domain-models'
import { rateFormDataSchema } from '../../domain-models/contractAndRates/formDataTypes'
import { z } from 'zod'
import {
    buildScalarFieldDiffChanges,
    type ScalarDiffFieldConfig,
} from './revisionDiffPrimitives'

type RateFormData = RateFormDataType

type DiffFieldConfig = {
    fieldPath: string
    getValue: (formData: RateFormData) => unknown | Error
}

const normalizeStringArray = (values: string[]): string[] => [...values].sort()

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

function buildBooleanFieldConfig(
    fieldPath: keyof RateFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        getValue: (formData) => formData[fieldPath] as boolean | undefined,
    }
}

function buildStringFieldConfig(
    fieldPath: keyof RateFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        getValue: (formData) => formData[fieldPath] as string | undefined,
    }
}

function buildDateFieldConfig(
    fieldPath: keyof RateFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        getValue: (formData) => formData[fieldPath] as Date | undefined,
    }
}

function buildStringArrayFieldConfig(
    fieldPath: keyof RateFormData & string
): DiffFieldConfig {
    return {
        fieldPath,
        getValue: (formData) =>
            normalizeStringArray(
                (formData[fieldPath] as string[] | undefined) ?? []
            ),
    }
}

const rateFieldConfigOverrides: Partial<
    Record<keyof RateFormData, DiffFieldConfig>
> = {
    rateProgramIDs: {
        fieldPath: 'rateProgramIDs',
        getValue: (formData) =>
            normalizeStringArray(formData.rateProgramIDs ?? []),
    },
    deprecatedRateProgramIDs: {
        fieldPath: 'deprecatedRateProgramIDs',
        getValue: (formData) =>
            normalizeStringArray(formData.deprecatedRateProgramIDs ?? []),
    },
    rateMedicaidPopulations: {
        fieldPath: 'rateMedicaidPopulations',
        getValue: (formData) =>
            normalizeStringArray(formData.rateMedicaidPopulations ?? []),
    },
}

const excludedRateFieldPaths = new Set<keyof RateFormData>([
    'id',
    'rateID',
    'rateDocuments',
    'supportingDocuments',
    'certifyingActuaryContacts',
    'addtlActuaryContacts',
    'packagesWithSharedRateCerts',
])

const diffRateFormDataFieldConfigs: DiffFieldConfig[] = Object.entries(
    rateFormDataSchema.shape as Record<string, z.core.$ZodType>
).flatMap(([fieldPath, schema]) => {
    const typedFieldPath = fieldPath as keyof RateFormData & string

    if (excludedRateFieldPaths.has(typedFieldPath)) {
        return []
    }

    const overriddenConfig = rateFieldConfigOverrides[typedFieldPath]
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

const scalarRateFormDataFieldConfigs: ScalarDiffFieldConfig<
    RateFormData,
    void
>[] = diffRateFormDataFieldConfigs.map((fieldConfig) => ({
    fieldPath: fieldConfig.fieldPath,
    getValue: (formData) => fieldConfig.getValue(formData),
}))

function buildRateDisplayName(rateRevision: RateRevisionType): string {
    return rateRevision.formData.rateCertificationName ?? rateRevision.rateID
}

function isIncludedInAnotherSubmission(
    rateRevision: RateRevisionType,
    newerSubmissionSubmittedAt: Date
): boolean {
    const sharedPackages =
        rateRevision.formData.packagesWithSharedRateCerts ?? []

    if (sharedPackages.length > 0) {
        return true
    }

    return (
        rateRevision.submitInfo?.updatedAt.getTime() !== undefined &&
        rateRevision.submitInfo.updatedAt.getTime() <
            newerSubmissionSubmittedAt.getTime()
    )
}

function buildAddedRate(
    rateRevision: RateRevisionType,
    newerSubmissionSubmittedAt: Date
): RevisionDiffAddedRate {
    return {
        rateID: rateRevision.rateID,
        rateCertificationName: buildRateDisplayName(rateRevision),
        includedInAnotherSubmission: isIncludedInAnotherSubmission(
            rateRevision,
            newerSubmissionSubmittedAt
        ),
    }
}

function buildRemovedRate(
    rateRevision: RateRevisionType
): RevisionDiffRemovedRate {
    return {
        rateID: rateRevision.rateID,
        rateCertificationName: buildRateDisplayName(rateRevision),
    }
}

function buildRevisedRate(
    olderRateRevision: RateRevisionType,
    rateRevision: RateRevisionType
): RevisionDiffRevisedRate | Error {
    const fieldChanges = buildScalarFieldDiffChanges(
        olderRateRevision.formData,
        rateRevision.formData,
        scalarRateFormDataFieldConfigs,
        undefined
    )

    if (fieldChanges instanceof Error) {
        return fieldChanges
    }

    return {
        rateID: rateRevision.rateID,
        rateCertificationName: buildRateDisplayName(rateRevision),
        fieldChanges,
    }
}

function buildRateChanges(
    olderSubmission: ContractPackageSubmissionType,
    newerSubmission: ContractPackageSubmissionType
): RevisionDiffRateChanges | Error {
    const olderRatesByID = new Map(
        olderSubmission.rateRevisions.map((rateRevision) => [
            rateRevision.rateID,
            rateRevision,
        ])
    )
    const newerRatesByID = new Map(
        newerSubmission.rateRevisions.map((rateRevision) => [
            rateRevision.rateID,
            rateRevision,
        ])
    )

    if (olderRatesByID.size !== olderSubmission.rateRevisions.length) {
        return new Error(
            'Duplicate rateID encountered while building rate revision diff'
        )
    }

    if (newerRatesByID.size !== newerSubmission.rateRevisions.length) {
        return new Error(
            'Duplicate rateID encountered while building rate revision diff'
        )
    }

    const added: RevisionDiffAddedRate[] = []
    const removed: RevisionDiffRemovedRate[] = []
    const revised: RevisionDiffRevisedRate[] = []

    for (const [rateID, olderRateRevision] of olderRatesByID) {
        const newerRateRevision = newerRatesByID.get(rateID)

        if (!newerRateRevision) {
            removed.push(buildRemovedRate(olderRateRevision))
            continue
        }

        if (olderRateRevision.id !== newerRateRevision.id) {
            const revisedRate = buildRevisedRate(
                olderRateRevision,
                newerRateRevision
            )

            if (revisedRate instanceof Error) {
                return revisedRate
            }

            revised.push(revisedRate)
        }
    }

    for (const [rateID, newerRateRevision] of newerRatesByID) {
        if (olderRatesByID.has(rateID)) {
            continue
        }

        added.push(
            buildAddedRate(
                newerRateRevision,
                newerSubmission.submitInfo.updatedAt
            )
        )
    }

    const sortByName = <TItem extends { rateCertificationName: string }>(
        left: TItem,
        right: TItem
    ) => left.rateCertificationName.localeCompare(right.rateCertificationName)

    return {
        added: added.sort(sortByName),
        removed: removed.sort(sortByName),
        revised: revised.sort(sortByName),
    }
}

export { buildRateChanges }
