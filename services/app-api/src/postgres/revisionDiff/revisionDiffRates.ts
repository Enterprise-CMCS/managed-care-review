import type {
    ActuaryContactType,
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
    isStringEnumLikeSchema,
    type ScalarDiffFieldConfig,
    unwrapSchema,
} from './revisionDiffPrimitives'
import {
    buildRateDocumentChanges,
    hasRateDocumentListChanges,
} from './revisionDiffRateDocuments'
import { buildRateActuaryContactDiffChanges } from './revisionDiffRateActuaries'

type RateFormData = RateFormDataType

type DiffFieldConfig = {
    fieldPath: string
    getValue: (formData: RateFormData) => unknown | Error
}

const normalizeStringArray = (values: string[]): string[] => [...values].sort()

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
 * lists rate form fields that are not already excluded, overridden, or supported by existing auto-diffing.
 * used to test if new rate form fields are added which need to be specifically handled in the revision diff logic.
 */
function getUnhandledRateDiffFieldPaths(): string[] {
    return Object.entries(
        rateFormDataSchema.shape as Record<string, z.core.$ZodType>
    ).flatMap(([fieldPath, schema]) => {
        const typedFieldPath = fieldPath as keyof RateFormData & string

        if (excludedRateFieldPaths.has(typedFieldPath)) {
            return []
        }

        if (rateFieldConfigOverrides[typedFieldPath]) {
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

const scalarRateFormDataFieldConfigs: ScalarDiffFieldConfig<
    RateFormData,
    void
>[] = diffRateFormDataFieldConfigs.map((fieldConfig) => ({
    fieldPath: fieldConfig.fieldPath,
    getValue: (formData) => fieldConfig.getValue(formData),
}))

function buildRateDisplayName(
    rateRevision: RateRevisionType
): string | undefined {
    return rateRevision.formData.rateCertificationName ?? undefined
}

function buildAddedRate(rateRevision: RateRevisionType): RevisionDiffAddedRate {
    return {
        rateID: rateRevision.rateID,
        rateCertificationName: buildRateDisplayName(rateRevision),
        // TODO(MCR-6481): identify when a rate on a submission diff is from another submission but linked to the current submission, e.g. a linked rate.
        isLinkedRate: false,
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
): { revisedRate: RevisionDiffRevisedRate; hasChanges: boolean } | Error {
    const fieldChanges = buildScalarFieldDiffChanges(
        olderRateRevision.formData,
        rateRevision.formData,
        scalarRateFormDataFieldConfigs,
        undefined
    )

    if (fieldChanges instanceof Error) {
        return fieldChanges
    }

    const certifyingActuaryContactChanges = buildRateActuaryContactDiffChanges(
        (olderRateRevision.formData.certifyingActuaryContacts ??
            []) as ActuaryContactType[],
        (rateRevision.formData.certifyingActuaryContacts ??
            []) as ActuaryContactType[]
    )

    const addtlActuaryContactChanges = buildRateActuaryContactDiffChanges(
        (olderRateRevision.formData.addtlActuaryContacts ??
            []) as ActuaryContactType[],
        (rateRevision.formData.addtlActuaryContacts ??
            []) as ActuaryContactType[]
    )

    const documentChanges = buildRateDocumentChanges(
        olderRateRevision,
        rateRevision
    )

    if (documentChanges instanceof Error) {
        return documentChanges
    }

    const revisedRate = {
        rateID: rateRevision.rateID,
        rateCertificationName: buildRateDisplayName(rateRevision),
        fieldChanges,
        rateDocuments: documentChanges.rateDocuments,
        supportingRateDocuments: documentChanges.supportingDocuments,
        certifyingActuaryContactChanges,
        addtlActuaryContactChanges,
    }

    return {
        revisedRate,
        hasChanges:
            revisedRate.fieldChanges.length > 0 ||
            revisedRate.certifyingActuaryContactChanges.length > 0 ||
            revisedRate.addtlActuaryContactChanges.length > 0 ||
            hasRateDocumentListChanges(
                revisedRate.rateDocuments,
                revisedRate.supportingRateDocuments
            ),
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

        const revisedRateResult = buildRevisedRate(
            olderRateRevision,
            newerRateRevision
        )

        if (revisedRateResult instanceof Error) {
            return revisedRateResult
        }

        if (revisedRateResult.hasChanges) {
            revised.push(revisedRateResult.revisedRate)
        }
    }

    for (const [rateID, newerRateRevision] of newerRatesByID) {
        if (olderRatesByID.has(rateID)) {
            continue
        }

        added.push(buildAddedRate(newerRateRevision))
    }

    const sortByName = <TItem extends { rateCertificationName?: string }>(
        left: TItem,
        right: TItem
    ) =>
        (left.rateCertificationName ?? '').localeCompare(
            right.rateCertificationName ?? ''
        )

    return {
        added: added.sort(sortByName),
        removed: removed.sort(sortByName),
        revised: revised.sort(sortByName),
    }
}

export { buildRateChanges, getUnhandledRateDiffFieldPaths }
