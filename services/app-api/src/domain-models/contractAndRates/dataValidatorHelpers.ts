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
import {
    submittableContractSchema,
    submittableEQROContractSchema,
} from './contractTypes'
import type { ContractType } from './contractTypes'
import type { GraphQLError } from 'graphql'
import { createUserInputError } from '../../resolvers/errorUtils'
import { setErrorAttributesOnActiveSpan } from '../../resolvers/attributeHelper'
import { logError } from '../../logger'
import type { Span } from '@opentelemetry/api'

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
        updateFormData.managedCareEntities?.includes('MCO') !==
        currentFormData.managedCareEntities?.includes('MCO')

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

/*
 * Logic tree can be found here for the following function: https://miro.com/app/board/o9J_lS5oLDk=/?share_link_id=716810250281
 */
export const validateEQROSubmission = (
    contract: ContractType,
    span?: Span
): GraphQLError | undefined => {
    const formData = contract.draftRevision!.formData
    const hasRates = contract.draftRates && contract.draftRates.length
    const isNotContractOnly = formData.submissionType !== 'CONTRACT_ONLY'
    const isBase = formData.contractType === 'BASE'
    const includesMCO = formData.managedCareEntities.includes('MCO')
    const isAmendment = formData.contractType === 'AMENDMENT'
    const isChipCovered =
        formData.populationCovered === 'CHIP' ||
        formData.populationCovered === 'MEDICAID_AND_CHIP'
    const contractID = contract.id

    const EQROValidationError = (errMessage: string) => {
        logError('submitContract', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
        return createUserInputError(errMessage, 'contractID', contract.id)
    }

    //Return an error early if the contract has rates or the wrong sub type
    if (hasRates || isNotContractOnly) {
        return EQROValidationError(
            `EQRO submissions must be contract only and not include any rates: ${contract.id}`
        )
    }

    const validateFields = (
        fields: Record<string, boolean | undefined>,
        errorContext: string
    ): GraphQLError | undefined => {
        for (const field in fields) {
            if (fields[field] == null) {
                return EQROValidationError(
                    `${field} is required for ${errorContext}: ${contractID}`
                )
            }
        }
    }

    //Field validations for different contract types
    if (isBase) {
        if (isChipCovered && includesMCO) {
            return validateFields(
                {
                    eqroNewContractor: formData.eqroNewContractor,
                    eqroProvisionMcoNewOptionalActivity:
                        formData.eqroProvisionMcoNewOptionalActivity,
                    eqroProvisionNewMcoEqrRelatedActivities:
                        formData.eqroProvisionNewMcoEqrRelatedActivities,
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities,
                },
                'BASE contracts with CHIP population & MCO entity'
            )
        }

        if (isChipCovered && !includesMCO) {
            return validateFields(
                {
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities,
                },
                'BASE contracts with CHIP population & no MCO entity'
            )
        }

        if (!isChipCovered && includesMCO) {
            return validateFields(
                {
                    eqroNewContractor: formData.eqroNewContractor,
                    eqroProvisionMcoNewOptionalActivity:
                        formData.eqroProvisionMcoNewOptionalActivity,
                    eqroProvisionNewMcoEqrRelatedActivities:
                        formData.eqroProvisionNewMcoEqrRelatedActivities,
                },
                'BASE contracts with MEDICAID population & MCO entity'
            )
        }
    }

    if (isAmendment) {
        if (isChipCovered && includesMCO) {
            const initialRequiredFields = validateFields(
                {
                    eqroProvisionMcoEqrOrRelatedActivities:
                        formData.eqroProvisionMcoEqrOrRelatedActivities,
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities,
                },
                'AMENDMENT contracts with CHIP population & MCO entity'
            )

            if (initialRequiredFields) {
                return initialRequiredFields
            }

            if (formData.eqroProvisionMcoEqrOrRelatedActivities === true) {
                return validateFields(
                    {
                        eqroProvisionMcoNewOptionalActivity:
                            formData.eqroProvisionMcoNewOptionalActivity,
                        eqroProvisionNewMcoEqrRelatedActivities:
                            formData.eqroProvisionNewMcoEqrRelatedActivities,
                    },
                    'AMENDMENT contracts where eqroProvisionMcoEqrOrRelatedActivities is true'
                )
            }
        }

        if (isChipCovered && !includesMCO) {
            return validateFields(
                {
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities,
                },
                'AMENDMENT contract with CHIP population & no MCO entity'
            )
        }

        if (!isChipCovered && includesMCO) {
            const initialRequiredFields = validateFields(
                {
                    eqroProvisionMcoEqrOrRelatedActivities:
                        formData.eqroProvisionMcoEqrOrRelatedActivities,
                },
                'AMENDMENT contracts with MEDICAID population & MCO entity'
            )

            if (initialRequiredFields) {
                return initialRequiredFields
            }

            if (formData.eqroProvisionMcoEqrOrRelatedActivities === true) {
                return validateFields(
                    {
                        eqroProvisionMcoNewOptionalActivity:
                            formData.eqroProvisionMcoNewOptionalActivity,
                        eqroProvisionNewMcoEqrRelatedActivities:
                            formData.eqroProvisionNewMcoEqrRelatedActivities,
                    },
                    'AMENDMENT contracts where eqroProvisionMcoEqrOrRelatedActivities is true'
                )
            }
        }
    }

    return
}

const parseEQROContract = (
    contract: ContractType,
    stateCode: string,
    store: Store
): ContractType | z.ZodError => {
    const eqroContractParser = submittableEQROContractSchema.superRefine(
        (contract, ctx) => {
            //Validating programs
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

            //Validating EQRO fields
            const validationError = validateEQROSubmission(contract)
            if (validationError) {
                ctx.addIssue({
                    code: 'custom',
                    message: validationError.message,
                })
            }
        }
    )

    const parsedData = eqroContractParser.safeParse(contract)

    if (parsedData.error) {
        return parsedData.error
    }

    return parsedData.data
}

export {
    validateContractDraftRevisionInput,
    parseContract,
    parseEQROContract,
    parseAndUpdateEqroFields,
    validateEQROContractDraftRevisionInput,
}
