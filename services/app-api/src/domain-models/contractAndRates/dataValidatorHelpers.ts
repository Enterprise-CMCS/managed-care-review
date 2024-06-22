import type { FeatureFlagSettings } from 'app-web/src/common-code/featureFlags'
import type { ContractDraftRevisionFormDataInput } from '../../gen/gqlServer'
import { contractFormDataSchema } from './formDataTypes'
import {
    contractTypeSchema,
    submissionTypeSchema,
} from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto/zodSchemas'
import { z } from 'zod'
import type { SafeParseReturnType } from 'zod'

const updateDraftContractFormDataSchema = contractFormDataSchema.extend({
    submissionType: submissionTypeSchema.optional(),
    contractType: contractTypeSchema.optional(),
    submissionDescription: z.string().optional(),
    statutoryRegulatoryAttestationDescription: z.string().optional(),
})

type UpdateDraftContractFormDataType = z.infer<
    typeof updateDraftContractFormDataSchema
>

const validateContractDraftRevisionFormDataInput = (
    formData: ContractDraftRevisionFormDataInput,
    featureFlags?: FeatureFlagSettings
): SafeParseReturnType<
    ContractDraftRevisionFormDataInput,
    UpdateDraftContractFormDataType
> => {
    return updateDraftContractFormDataSchema
        .extend({
            statutoryRegulatoryAttestationDescription: z
                .string()
                .optional()
                .transform((val, ctx) => {
                    if (featureFlags?.['438-attestation']) {
                        if (!formData.statutoryRegulatoryAttestation && !val) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message:
                                    'statutoryRegulatoryAttestationDescription must be defined when statutoryRegulatoryAttestation is false',
                            })
                        }

                        // Clear out existing statutoryRegulatoryAttestationDescription if statutoryRegulatoryAttestation is true
                        if (formData.statutoryRegulatoryAttestation && val) {
                            return undefined
                        }
                    }

                    return val
                }),
        })
        .safeParse(formData)
}

export { validateContractDraftRevisionFormDataInput }
