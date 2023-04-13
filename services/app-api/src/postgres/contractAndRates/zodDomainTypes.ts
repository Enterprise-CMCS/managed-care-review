import { z } from 'zod'

const ZodRateRevision = z.object({
    id: z.string(),
    rateID: z.string(),

    name: z.string(),
    rateCertURL: z.string(),
})

const ZodRateRevisionDraft = ZodRateRevision.partial({
    rateCertURL: true,
})

const ZodContractRevision = z.object({
    id: z.string(),
    contractID: z.string(),

    name: z.string(),
    contractDescription: z.string(),

    rateRevisions: z.optional(z.array(ZodRateRevision))
})

const ZodSubmissionType = z.enum(['CONTRACT_ONLY', 'CONTRACT_AND_RATES'])

const ZodContractFormDataV0 = z.object({
    schemaName: z.literal('contractFormData'),
    schemaVersion: z.literal(0),

    contractDescription: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    submissionType: ZodSubmissionType,
})
type ZodContractFormDataTypeV0 = z.infer<typeof ZodContractFormDataV0>


const ZodFederalAuthority = z.enum([
    'STATE_PLAN',
    'WAIVER_1915B',
    'WAIVER_1115',
    'VOLUNTARY',
    'BENCHMARK',
    'TITLE_XXI',
])

const ZodContractFormDataV1 = ZodContractFormDataV0.merge(z.object({
    schemaVersion: z.literal(1),

    federalAuthorities: z.array(ZodFederalAuthority),
}))
type ZodContractFormDataTypeV1 = z.infer<typeof ZodContractFormDataV1>

const ModifiedProvisionsV0 = z.object({
    modifiedGeoAreaServed: z.boolean(),
    modifiedRiskSharingStrategy: z.boolean(),
})

const ZodContractFormDataV2 = ZodContractFormDataV1.merge(z.object({
    schemaVersion: z.literal(2),

    modifiedProvisions: ModifiedProvisionsV0,
}))
type ZodContractFormDataTypeV2 = z.infer<typeof ZodContractFormDataV2>


const ModifiedProvisionsV1 = ModifiedProvisionsV0.merge(z.object({
    modifiedPassThroughPayments: z.boolean(),
}))

const ZodContractFormDataV3 = ZodContractFormDataV1.merge(z.object({
    schemaVersion: z.literal(3),

    modifiedProvisions: ModifiedProvisionsV1,
}))
type ZodContractFormDataTypeV3 = z.infer<typeof ZodContractFormDataV3>


const ZodContractFormDataVCurrent = ZodContractFormDataV3
type ZodContractFormDataTypeVCurrent = z.infer<typeof ZodContractFormDataVCurrent>

const ZodDraftContractFormData = ZodContractFormDataVCurrent.merge(z.object({
    schemaVersion: z.number().transform(() => 3),
})).deepPartial()

type ZodDraftContractFormDataType = z.infer<typeof ZodDraftContractFormData>


const ZodContractFormDataVAll = z.discriminatedUnion('schemaVersion', [
    ZodContractFormDataV0, 
    ZodContractFormDataV1,
    ZodContractFormDataV2,
    ZodContractFormDataV3,
])

const ZodContractRevisionDraft = ZodContractRevision.merge(z.object({
    rateRevisions: z.optional(z.array(ZodRateRevisionDraft))
})).partial({
    contractDescription: true,
})

type ZodContractRevisionType = z.infer<typeof ZodContractRevision>
type ZodContractRevisionDraftType = z.infer<typeof ZodContractRevisionDraft>
type ZodRateRevisionType = z.infer<typeof ZodRateRevision>



const ZodBaseRateFormData = z.object({
    schemaName: z.literal('rateFormData'),
    schemaVersion: z.literal(0),

    rateType: z.string(),
    rateCapitationType: z.enum(['RATE_CELL', 'RATE_RANGE']),
    rateDateStart: z.string(),
    rateDateEnd: z.string(),
})

const ZodRateAmendmentFormData = z.object({
    rateType: z.literal('AMENDMENT'),

    amendmentDateStart: z.string(),
    amendmentDateEnd: z.string(),
})

const ZodNewRateAmendmentFormDataV0 = z.object({
    rateType: z.literal('NEW'),
})

const ZodRateFormDataV0 = z.intersection(ZodBaseRateFormData, z.discriminatedUnion('rateType', [ZodRateAmendmentFormData, ZodNewRateAmendmentFormDataV0]))
type ZodRateFormDataTypeV0 = z.infer<typeof ZodRateFormDataV0>

const ZodNewRateAmendmentFormDataV1 = ZodNewRateAmendmentFormDataV0.merge(z.object({
    exactStartDate: z.date(),
}))

const ZodRateFormDataV1 = z.intersection(ZodBaseRateFormData, z.discriminatedUnion('rateType', [ZodRateAmendmentFormData, ZodNewRateAmendmentFormDataV1]))
type ZodRateFormDataTypeV1 = z.infer<typeof ZodRateFormDataV1>

export type {
    ZodContractRevisionType,
    ZodContractRevisionDraftType,
    ZodRateRevisionType,

    ZodContractFormDataTypeV0,
    ZodContractFormDataTypeV1,
    ZodContractFormDataTypeV2,
    ZodContractFormDataTypeV3,

    ZodRateFormDataTypeV0,
    ZodRateFormDataTypeV1,

    ZodContractFormDataTypeVCurrent,
    ZodDraftContractFormDataType,
}

export {
    ZodContractFormDataV0,
    ZodContractFormDataV1,
    ZodContractFormDataV3,
    ZodContractFormDataVCurrent,
    ZodDraftContractFormData,
    ZodContractFormDataVAll,

    ZodRateFormDataV0,
    ZodRateFormDataV1,

    ZodContractRevision,
    ZodContractRevisionDraft,
    ZodRateRevision,
}
