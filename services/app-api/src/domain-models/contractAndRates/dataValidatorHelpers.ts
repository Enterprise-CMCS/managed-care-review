import type { FeatureFlagSettings } from 'app-web/src/common-code/featureFlags'
import type {
    ContractDraftRevisionFormDataInput,
    ContractDraftRevisionInput,
} from '../../gen/gqlServer'
import { contractFormDataSchema, preprocessNulls } from './formDataTypes'
import {
    contractTypeSchema,
    populationCoveredSchema,
} from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto/zodSchemas'
import { z } from 'zod'
import { findStatePrograms } from '../../postgres'

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

const validateProgramIDs = (stateCode: string) => {
    const allPrograms = findStatePrograms(stateCode)

    return z.array(z.string()).superRefine((programs, ctx) => {
        if (allPrograms instanceof Error) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: allPrograms.message,
            })
        } else {
            const allProgramIDS = allPrograms.map((p) => p.id)

            if (!programs.every((program) => allProgramIDS.includes(program))) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `programIDs are invalid for the state ${stateCode}`,
                })
            }
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
    draftRevision: ContractDraftRevisionInput,
    stateCode: string,
    featureFlags?: FeatureFlagSettings
): UpdateDraftContractFormDataType | Error => {
    const formData = draftRevision.formData

    const parsedData = updateDraftContractFormDataSchema
        .extend({
            statutoryRegulatoryAttestationDescription:
                validateStatutoryRegulatoryAttestation(formData, featureFlags),
            programIDs: validateProgramIDs(stateCode),
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
