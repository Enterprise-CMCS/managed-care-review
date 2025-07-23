import { dsnpTriggers } from '@mc-review/common-code'
import type { FeatureFlagSettings } from '@mc-review/common-code'
import type {
    ContractDraftRevisionFormDataInput,
    Rate,
} from '../../gen/gqlServer'
import { contractFormDataSchema, preprocessNulls } from './formDataTypes'
import { contractTypeSchema, populationCoveredSchema } from '@mc-review/hpp'
import { z } from 'zod'
import type { Store } from '../../postgres'
import { submittableContractSchema } from './contractTypes'
import type { ContractType } from './contractTypes'

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
            .transform((val) => {
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

const refineForFeatureFlags = (featureFlags?: FeatureFlagSettings) => {
    if (featureFlags) {
        return submittableContractSchema.superRefine((contract, ctx) => {
            const formData = contract.draftRevision.formData
            if (featureFlags['438-attestation']) {
                // since we have different validations based on a feature flag, we add them as a refinement here.
                // once 438 attestation ships this refinement should be moved to the submittableContractSchema
                // and statutoryRegulatoryAttestation should be made non-optional.

                if (formData.statutoryRegulatoryAttestation === undefined) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message:
                            'statutoryRegulatoryAttestationDescription is required when  438-attestation feature flag is on',
                    })
                }

                if (
                    (formData.statutoryRegulatoryAttestation === false &&
                        !formData.statutoryRegulatoryAttestationDescription) ||
                    (formData.statutoryRegulatoryAttestationDescription &&
                        formData.statutoryRegulatoryAttestationDescription
                            .length === 0)
                ) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message:
                            'statutoryRegulatoryAttestationDescription is Required if statutoryRegulatoryAttestation is false',
                    })
                }
            }
            if (featureFlags['dsnp']) {
                // when the dnsp flag is on, the dsnpContract field becomes
                // required IF the submission's federal authorities include
                // ANY of the following: 'STATE_PLAN','WAIVER_1915B', 'WAIVER_1115', 'VOLUNTARY'
                const dsnpIsReuired = formData.federalAuthorities.some(
                    (authority) => dsnpTriggers.includes(authority)
                )
                if (dsnpIsReuired && formData.dsnpContract === null) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: `dsnpContract is required when any of the following Federal Authorities are present: ${dsnpTriggers.toString()}`,
                    })
                }
                // if the contract is associated with a DSNP then
                // associated rate Medicaid populations must be selected
                contract.draftRates.forEach((rate: Rate) => {
                    const rateFormData = rate.draftRevision?.formData
                    const noRateMedicaidPopulations =
                        !rateFormData?.rateMedicaidPopulations ||
                        rateFormData?.rateMedicaidPopulations?.length === 0
                    const isDSNPContract = formData.dsnpContract

                    if (isDSNPContract && noRateMedicaidPopulations) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `rateMedicaidPopulations is required for when dsnpContract is true`,
                        })
                    }
                })
            }
        })
    } else {
        return submittableContractSchema
    }
}

const parseContract = (
    contract: ContractType,
    stateCode: string,
    store: Store,
    featureFlags?: FeatureFlagSettings
): ContractType | z.ZodError => {
    const contractParser = refineForFeatureFlags(featureFlags)

    // since validating programs requires looking in the DB, and once we move programs into the db that
    // validation will be performed there instead. I'm just adding this check as a refinement instead of trying
    // to make it part of the core zod parsing.
    const contractWithProgramsParser = contractParser.superRefine(
        (contract, ctx) => {
            const contractProgramsIDs = new Set(
                contract.draftRevision.formData.programIDs
            )
            const allProgramIDs = contract.draftRates.reduce((acc, rate) => {
                const rateFormData = rate.draftRevision.formData
                const rateProgramIDs = rateFormData.rateProgramIDs.concat(
                    rateFormData.deprecatedRateProgramIDs
                )
                return new Set([...acc, ...rateProgramIDs])
            }, contractProgramsIDs)

            const findResult = store.findPrograms(stateCode, [...allProgramIDs])
            if (findResult instanceof Error) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: findResult.message,
                })
            }
        }
    )

    const parsedData = contractWithProgramsParser.safeParse(contract)

    if (parsedData.error) {
        return parsedData.error
    }

    return parsedData.data
}

export { validateContractDraftRevisionInput, parseContract }
