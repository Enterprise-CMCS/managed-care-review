import { dsnpTriggers } from '@mc-review/submissions'
import type { FeatureFlagSettings } from '@mc-review/common-code'
import type { ContractDraftRevisionFormDataInput } from '../../gen/gqlServer'
import type { ContractFormDataType } from './formDataTypes'
import {
    preprocessNulls,
    populationCoveredSchema,
    updateDraftContractFormDataSchema,
    type UpdateDraftContractFormDataType,
} from './formDataTypes'
import { z } from 'zod'
import type { Store } from '../../postgres'
import { submittableContractSchema } from './contractTypes'
import type { ContractType } from './contractTypes'

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
                code: 'custom',
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
                code: 'custom',
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

/**
 * Clears all conditional EQRO question responses when any of the triggering
 * questions (contract type, population covered, or managed care entities) have changed.
 *
 * This ensures users must re-answer EQRO questions when their upstream selections change,
 * since different combinations of triggering questions display different EQRO questions.
 *
 * @param currentFormData - The existing form data from the database
 * @param updateFormData - The incoming form data with user updates
 * @returns The updated form data with EQRO fields nullified if triggering questions changed
 */
const parseAndUpdateEqroFields = (
    currentFormData: ContractFormDataType,
    updateFormData: UpdateDraftContractFormDataType
) => {
    const mutatableFormData = { ...updateFormData }

    // Normalize CHIP and MEDICAID_AND_CHIP switching from one to the other results in no changes in conditional questions.
    const normalizePopulation = (population: string | undefined | null) =>
        population === 'CHIP' || population === 'MEDICAID_AND_CHIP'
            ? 'CHIP_RELATED'
            : population

    // Check if any EQRO triggering questions have changed
    const contractTypeChanged =
        updateFormData.contractType !== currentFormData.contractType
    const populationChanged =
        normalizePopulation(updateFormData.populationCovered) !==
        normalizePopulation(currentFormData.populationCovered)
    const managedCareEntitiesChanged =
        JSON.stringify(updateFormData.managedCareEntities?.slice().sort()) !==
        JSON.stringify(currentFormData.managedCareEntities?.slice().sort())

    if (
        !contractTypeChanged &&
        !populationChanged &&
        !managedCareEntitiesChanged
    ) {
        return mutatableFormData
    }

    // Clear all conditional EQRO questions if contract type, population, or managed care entities changed
    mutatableFormData.eqroNewContractor = null
    mutatableFormData.eqroProvisionChipEqrRelatedActivities = null
    mutatableFormData.eqroProvisionMcoEqrOrRelatedActivities = null
    mutatableFormData.eqroProvisionMcoNewOptionalActivity = null
    mutatableFormData.eqroProvisionNewMcoEqrRelatedActivities = null

    return mutatableFormData
}

const validateEQROContractDraftRevisionInput = (
    formData: ContractDraftRevisionFormDataInput,
    stateCode: string,
    store: Store,
    featureFlags?: FeatureFlagSettings
): UpdateDraftContractFormDataType | Error => {
    // Validate against schema
    const { data, error } = updateDraftContractFormDataSchema
        .extend({
            programIDs: validateProgramIDs(stateCode, store),
        })
        .safeParse(formData)

    if (error) {
        return error
    }

    if (!data) {
        return new Error(
            'Error: validateEQROContractDraftRevisionInput returned no data'
        )
    }

    return data
}

const refineForFeatureFlags = (featureFlags?: FeatureFlagSettings) => {
    if (featureFlags) {
        return submittableContractSchema.superRefine((contract, ctx) => {
            const contractFormData = contract.draftRevision.formData
            if (featureFlags['438-attestation']) {
                // since we have different validations based on a feature flag, we add them as a refinement here.
                // once 438 attestation ships this refinement should be moved to the submittableContractSchema
                // and statutoryRegulatoryAttestation should be made non-optional.

                if (
                    contractFormData.statutoryRegulatoryAttestation ===
                    undefined
                ) {
                    ctx.addIssue({
                        code: 'custom',
                        message:
                            'statutoryRegulatoryAttestationDescription is required when 438-attestation feature flag is on',
                    })
                }

                if (
                    (contractFormData.statutoryRegulatoryAttestation ===
                        false &&
                        !contractFormData.statutoryRegulatoryAttestationDescription) ||
                    (contractFormData.statutoryRegulatoryAttestationDescription &&
                        contractFormData
                            .statutoryRegulatoryAttestationDescription
                            .length === 0)
                ) {
                    ctx.addIssue({
                        code: 'custom',
                        message:
                            'statutoryRegulatoryAttestationDescription is Required if statutoryRegulatoryAttestation is false',
                    })
                }
            }
            if (featureFlags['dsnp']) {
                // when the dnsp flag is on, the dsnpContract field becomes
                // required IF the submission's federal authorities include
                // ANY of the following: 'STATE_PLAN','WAIVER_1915B', 'WAIVER_1115', 'VOLUNTARY'
                const dsnpIsRequired = contractFormData.federalAuthorities.some(
                    (authority) => dsnpTriggers.includes(authority)
                )

                const dsnpNotAnswered =
                    contractFormData.dsnpContract === null ||
                    contractFormData.dsnpContract === undefined
                if (dsnpIsRequired && dsnpNotAnswered) {
                    ctx.addIssue({
                        code: 'custom',
                        message: `dsnpContract is required when any of the following Federal Authorities are present: ${dsnpTriggers.toString()}`,
                    })
                }
                // if the contract is associated with a DSNP then
                // associated rate Medicaid populations must be selected
                contract.draftRates.forEach((rate) => {
                    const rateFormData = rate.draftRevision?.formData
                    const noRateMedicaidPopulations =
                        !rateFormData?.rateMedicaidPopulations ||
                        rateFormData?.rateMedicaidPopulations?.length === 0
                    const isDSNPContract = contractFormData.dsnpContract

                    if (isDSNPContract && noRateMedicaidPopulations) {
                        ctx.addIssue({
                            code: 'custom',
                            message: `rateMedicaidPopulations is required when dsnpContract is true`,
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
                    code: 'custom',
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

export {
    validateContractDraftRevisionInput,
    parseContract,
    parseAndUpdateEqroFields,
    validateEQROContractDraftRevisionInput,
}
