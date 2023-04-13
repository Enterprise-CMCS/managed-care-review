import { z } from 'zod'

const ZodSubmissionType = z.enum(['CONTRACT_ONLY', 'CONTRACT_AND_RATES'])

const ZodFederalAuthority = z.enum([
    'STATE_PLAN',
    'WAIVER_1915B',
    'WAIVER_1115',
    'VOLUNTARY',
    'BENCHMARK',
    'TITLE_XXI',
])


const ModifiedProvisions = z.object({
    modifiedGeoAreaServed: z.boolean(),
    modifiedRiskSharingStrategy: z.boolean(),
    modifiedPassThroughPayments: z.union([z.boolean(), z.literal('NOT_SET')]),
})

// Full Type // this is any previously submitted thing // some things have an NOT_REQUIRED_AT_THE_TIME option.
const ZodLockedContractFormData = z.object({
    contractDescription: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    submissionType: ZodSubmissionType,
    federalAuthorities: z.union([z.array(ZodFederalAuthority), z.literal('NOT_SET')]),
    modifiedProvisions: z.union([ModifiedProvisions, z.literal('NOT_SET')]),
})

type ZodLockedContractFormDataType = z.infer<typeof ZodLockedContractFormData>

// Validation // this is for the instant of submission
const ZodValidLockedContractFormData = ZodLockedContractFormData
    .refine((fd) => fd.federalAuthorities !== 'NOT_SET')
    .refine((fd) => fd.modifiedProvisions !== 'NOT_SET' && fd.modifiedProvisions.modifiedPassThroughPayments !== 'NOT_SET')

// DraftType // Technically should be anything in a current submission, but probably is anything ever possibly submitted.
const ZodUnlockedContractFormData = ZodLockedContractFormData.deepPartial()
type ZodUnlockedContractFormDataType = z.infer<typeof ZodUnlockedContractFormData>

export type {
    ZodLockedContractFormDataType,
    ZodUnlockedContractFormDataType,
}

export {
    ZodLockedContractFormData,
    ZodValidLockedContractFormData,
    ZodUnlockedContractFormData
}
