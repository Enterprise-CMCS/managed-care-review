import type { FeatureFlagSettings } from '../../common-code/featureFlags'
import type { ContractDraftRevisionFormDataInput } from '../../gen/gqlServer'
import {
    contractFormDataSchema,
    preprocessNulls,
    rateFormDataSchema,
    documentSchema,
} from './formDataTypes'
import {
    contractTypeSchema,
    populationCoveredSchema,
} from '../../common-code/proto/healthPlanFormDataProto/zodSchemas'
import { z } from 'zod'
import type { Store } from '../../postgres'
import { contractSchema } from './contractTypes'
import type { ContractType } from './contractTypes'
import { contractRevisionSchema, rateRevisionSchema } from './revisionTypes'
import { rateWithoutDraftContractsSchema } from './baseContractRateTypes'
const updateDraftContractFormDataSchema = contractFormDataSchema.extend({
    contractType: preprocessNulls(contractTypeSchema.optional()),
    submissionDescription: preprocessNulls(z.string().optional()),
})

type UpdateDraftContractFormDataType = z.infer<
    typeof updateDraftContractFormDataSchema
>

const validateStatutoryRegulatoryAttestation = (
    formData: ContractDraftRevisionFormDataInput,
    featureFlags?: FeatureFlagSettings
) =>
    preprocessNulls(
        z
            .string()
            .optional()
            .transform((val, ctx) => {
                if (featureFlags?.['438-attestation']) {
                    // Clear out existing statutoryRegulatoryAttestationDescription if statutoryRegulatoryAttestation is true
                    if (formData.statutoryRegulatoryAttestation && val) {
                        return undefined
                    }
                }

                return val ?? undefined
            })
    )

const validateProgramIDs = (stateCode: string, store: Store) => {
    return z.array(z.string()).superRefine((programs, ctx) => {
        const allPrograms = store.findPrograms(stateCode, programs)
        if (allPrograms instanceof Error) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: allPrograms.message,
            })
        }
    })
}

const validatePopulationCovered = (
    formData: ContractDraftRevisionFormDataInput
) =>
    populationCoveredSchema.optional().superRefine((coveredType, ctx) => {
        if (
            coveredType === 'CHIP' &&
            formData.submissionType === 'CONTRACT_AND_RATES'
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    'populationCoveredSchema of CHIP cannot be submissionType of CONTRACT_AND_RATES',
            })
        }
    })

const validateContractDraftRevisionInput = (
    formData: ContractDraftRevisionFormDataInput,
    stateCode: string,
    store: Store,
    featureFlags?: FeatureFlagSettings
): UpdateDraftContractFormDataType | Error => {
    const parsedData = updateDraftContractFormDataSchema
        .extend({
            statutoryRegulatoryAttestationDescription:
                validateStatutoryRegulatoryAttestation(formData, featureFlags),
            programIDs: validateProgramIDs(stateCode, store),
            populationCovered: validatePopulationCovered(formData),
        })
        .safeParse(formData)

    if (parsedData.error) {
        return parsedData.error
    }

    if (!parsedData.data) {
        return new Error(
            'Error: validateContractDraftRevisionInput returned no data'
        )
    }

    return parsedData.data
}

const parseContract = (
    contract: ContractType,
    featureFlags?: FeatureFlagSettings
): ContractType | Error => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const formData = contract.draftRevision?.formData!
    const parsedData = contractSchema
        .extend({
            draftRevision: contractRevisionSchema.extend({
                formData: contractFormDataSchema.extend({
                    contractDocuments: z.array(documentSchema).min(1),
                    statutoryRegulatoryAttestationDescription: z
                        .string()
                        .superRefine((attestationDescription, ctx) => {
                            if (
                                featureFlags?.['438-attestation'] &&
                                !attestationDescription
                            ) {
                                ctx.addIssue({
                                    code: z.ZodIssueCode.custom,
                                    message:
                                        'statutoryRegulatoryAttestationDescription is required when  438-attestation feature flag is on',
                                })
                            }
                        }),
                    populationCovered: validatePopulationCovered(formData),
                }),
            }),
            draftRates: z.array(
                rateWithoutDraftContractsSchema.extend({
                    draftRevision: rateRevisionSchema.extend({
                        formData: rateFormDataSchema.superRefine(
                            (
                                {
                                    rateType,
                                    amendmentEffectiveDateEnd,
                                    amendmentEffectiveDateStart,
                                },
                                ctx
                            ) => {
                                if (rateType === 'AMENDMENT') {
                                    if (!amendmentEffectiveDateEnd) {
                                        ctx.addIssue({
                                            code: z.ZodIssueCode.custom,
                                            message:
                                                'amendmentEffectiveDateEnd is required if rateType is AMENDMENT',
                                            path: ['amendmentEffectiveDateEnd'],
                                        })
                                    }
                                    if (!amendmentEffectiveDateStart) {
                                        ctx.addIssue({
                                            code: z.ZodIssueCode.custom,
                                            message:
                                                'amendmentEffectiveDateStart is required if rateType is AMENDMENT',
                                            path: [
                                                'amendmentEffectiveDateStart',
                                            ],
                                        })
                                    }
                                }
                            }
                        ),
                    }),
                })
            ),
        })
        .safeParse(contract)

    if (parsedData.error) {
        return parsedData.error
    }

    if (!parsedData.data) {
        return new Error(
            'Error: validateContractDraftRevisionInput returned no data'
        )
    }

    return parsedData.data
}

export { validateContractDraftRevisionInput, parseContract }
