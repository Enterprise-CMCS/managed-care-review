import { ContractFormData } from '../gen/gqlClient'

/**
 * Validation function for EQRO submission specific required data based on conditional
 * triggers and returns a review determination or Error.
 * Logic tree: https://miro.com/app/board/o9J_lS5oLDk=/?share_link_id=716810250281
 *
 * A review determination is if the submission requires a review from CMS.
 *
 * @param contractID - ContractID for the submission.
 * @param formData - formData of the submission
 * @returns {Error} - on failed validations and undefined on successful validations.
 * @returns {true} - EQRO submission is subject to review
 * @returns {false} - EQRO submission is not subject to review.
 */
export const eqroValidationAndReviewDetermination = (
    contractID: string,
    formData: ContractFormData
): Error | boolean => {
    const isBase = formData.contractType === 'BASE'
    const includesMCO = formData.managedCareEntities.includes('MCO')
    const isAmendment = formData.contractType === 'AMENDMENT'
    const isChipCovered =
        formData.populationCovered === 'CHIP' ||
        formData.populationCovered === 'MEDICAID_AND_CHIP'

    const validateFields = (
        fields: Record<string, boolean | undefined | null>,
        errorContext: string
    ): Error | undefined => {
        for (const field in fields) {
            if (fields[field] == null) {
                return new Error(
                    `${field} is required for ${errorContext}: ${contractID}`
                )
            }
        }
    }

    // Default to not subject to review.
    let reviewRequired = false

    //Validates at least one of the fields check is yes.
    const validateForYes = (
        fields: Record<string, boolean | undefined | null>,
    ): boolean => {
        for (const field in fields) {
            if (fields[field] == true) {
                return true
            }
        }

        return false
    }

    //Field validations for different contract types
    if (isBase) {
        if (isChipCovered && includesMCO) {
            const validation = validateFields(
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

            if (validation instanceof Error) {
                return validation
            }

            // Review determination
            reviewRequired = validateForYes({
                eqroNewContractor: formData.eqroNewContractor,
                eqroProvisionMcoNewOptionalActivity:
                    formData.eqroProvisionMcoNewOptionalActivity,
                eqroProvisionNewMcoEqrRelatedActivities:
                    formData.eqroProvisionNewMcoEqrRelatedActivities,
            })
        }

        // This condition results to no review required
        if (isChipCovered && !includesMCO) {
            const validation = validateFields(
                {
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities,
                },
                'BASE contracts with CHIP population & no MCO entity'
            )

            if (validation instanceof Error) {
                return validation
            }

            // Review determination not required. Not subject to review.
        }

        if (!isChipCovered && includesMCO) {
            const validation = validateFields(
                {
                    eqroNewContractor: formData.eqroNewContractor,
                    eqroProvisionMcoNewOptionalActivity:
                        formData.eqroProvisionMcoNewOptionalActivity,
                    eqroProvisionNewMcoEqrRelatedActivities:
                        formData.eqroProvisionNewMcoEqrRelatedActivities,
                },
                'BASE contracts with MEDICAID population & MCO entity'
            )

            if (validation instanceof Error) {
                return validation
            }

            // Review determination
            reviewRequired = validateForYes({
                eqroNewContractor: formData.eqroNewContractor,
                eqroProvisionMcoNewOptionalActivity:
                    formData.eqroProvisionMcoNewOptionalActivity,
                eqroProvisionNewMcoEqrRelatedActivities:
                    formData.eqroProvisionNewMcoEqrRelatedActivities,
            })
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

            if (initialRequiredFields instanceof Error) {
                return initialRequiredFields
            }

            if (formData.eqroProvisionMcoEqrOrRelatedActivities === true) {
                const validation = validateFields(
                    {
                        eqroProvisionMcoNewOptionalActivity:
                            formData.eqroProvisionMcoNewOptionalActivity,
                        eqroProvisionNewMcoEqrRelatedActivities:
                            formData.eqroProvisionNewMcoEqrRelatedActivities,
                    },
                    'AMENDMENT contracts where eqroProvisionMcoEqrOrRelatedActivities is true'
                )

                if (validation instanceof Error) {
                    return validation
                }

                // Review determination
                reviewRequired = validateForYes({
                    eqroProvisionMcoNewOptionalActivity:
                        formData.eqroProvisionMcoNewOptionalActivity,
                    eqroProvisionNewMcoEqrRelatedActivities:
                        formData.eqroProvisionNewMcoEqrRelatedActivities,
                })
            }

            // Review determination not required. Not subject to review.
        }

        // This condition results to no review required
        if (isChipCovered && !includesMCO) {
            const validation = validateFields(
                {
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities,
                },
                'AMENDMENT contract with CHIP population & no MCO entity'
            )

            if (validation instanceof Error) {
                return validation
            }

            // Review determination not required. Not subject to review.
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
                const validation = validateFields(
                    {
                        eqroProvisionMcoNewOptionalActivity:
                            formData.eqroProvisionMcoNewOptionalActivity,
                        eqroProvisionNewMcoEqrRelatedActivities:
                            formData.eqroProvisionNewMcoEqrRelatedActivities,
                    },
                    'AMENDMENT contracts where eqroProvisionMcoEqrOrRelatedActivities is true'
                )

                if (validation) {
                    return validation
                }

                // Review determination
                reviewRequired = validateForYes({
                    eqroProvisionMcoNewOptionalActivity:
                        formData.eqroProvisionMcoNewOptionalActivity,
                    eqroProvisionNewMcoEqrRelatedActivities:
                        formData.eqroProvisionNewMcoEqrRelatedActivities,
                })
            }

            // Review determination not required. Not subject to review.
        }
    }

    return reviewRequired
}
