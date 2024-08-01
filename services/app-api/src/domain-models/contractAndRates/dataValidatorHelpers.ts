import type { FeatureFlagSettings } from '../../common-code/featureFlags'
import type { ContractDraftRevisionFormDataInput } from '../../gen/gqlServer'
import { contractFormDataSchema, preprocessNulls } from './formDataTypes'
import {
    contractTypeSchema,
    populationCoveredSchema,
} from '../../common-code/proto/healthPlanFormDataProto/zodSchemas'
import { z } from 'zod'
import type { Store } from '../../postgres'

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

export { validateContractDraftRevisionInput }
