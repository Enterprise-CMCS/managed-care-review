import { ContractFormData } from '../gen/gqlClient'

/**
 * Validation function for EQRO submission specific required data based on conditional
 * triggers. Logic tree: https://miro.com/app/board/o9J_lS5oLDk=/?share_link_id=716810250281
 *
 * @param contractID - ContractID for the submission.
 * @param formData - formData of the submission
 * @returns Error on failed validations and undefined on successful validations.
 */
export const validateEQROdata = (
    contractID: string,
    formData: ContractFormData
): Error | undefined => {
    const isBase = formData.contractType === 'BASE'
    const includesMCO = formData.managedCareEntities.includes('MCO')
    const isAmendment = formData.contractType === 'AMENDMENT'
    const isChipCovered =
        formData.populationCovered === 'CHIP' ||
        formData.populationCovered === 'MEDICAID_AND_CHIP'

    const validateFields = (
        fields: Record<string, boolean | undefined>,
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

    //Field validations for different contract types
    if (isBase) {
        if (isChipCovered && includesMCO) {
            return validateFields(
                {
                    eqroNewContractor: formData.eqroNewContractor ?? undefined,
                    eqroProvisionMcoNewOptionalActivity:
                        formData.eqroProvisionMcoNewOptionalActivity ?? undefined,
                    eqroProvisionNewMcoEqrRelatedActivities:
                        formData.eqroProvisionNewMcoEqrRelatedActivities ?? undefined,
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities ?? undefined,
                },
                'BASE contracts with CHIP population & MCO entity'
            )
        }

        if (isChipCovered && !includesMCO) {
            return validateFields(
                {
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities ?? undefined,
                },
                'BASE contracts with CHIP population & no MCO entity'
            )
        }

        if (!isChipCovered && includesMCO) {
            return validateFields(
                {
                    eqroNewContractor: formData.eqroNewContractor ?? undefined,
                    eqroProvisionMcoNewOptionalActivity:
                        formData.eqroProvisionMcoNewOptionalActivity ?? undefined,
                    eqroProvisionNewMcoEqrRelatedActivities:
                        formData.eqroProvisionNewMcoEqrRelatedActivities ?? undefined,
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
                        formData.eqroProvisionMcoEqrOrRelatedActivities  ?? undefined,
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities  ?? undefined,
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
                            formData.eqroProvisionMcoNewOptionalActivity  ?? undefined,
                        eqroProvisionNewMcoEqrRelatedActivities:
                            formData.eqroProvisionNewMcoEqrRelatedActivities  ?? undefined,
                    },
                    'AMENDMENT contracts where eqroProvisionMcoEqrOrRelatedActivities is true'
                )
            }
        }

        if (isChipCovered && !includesMCO) {
            return validateFields(
                {
                    eqroProvisionChipEqrRelatedActivities:
                        formData.eqroProvisionChipEqrRelatedActivities  ?? undefined,
                },
                'AMENDMENT contract with CHIP population & no MCO entity'
            )
        }

        if (!isChipCovered && includesMCO) {
            const initialRequiredFields = validateFields(
                {
                    eqroProvisionMcoEqrOrRelatedActivities:
                        formData.eqroProvisionMcoEqrOrRelatedActivities  ?? undefined,
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
                            formData.eqroProvisionMcoNewOptionalActivity ?? undefined,
                        eqroProvisionNewMcoEqrRelatedActivities:
                            formData.eqroProvisionNewMcoEqrRelatedActivities  ?? undefined,
                    },
                    'AMENDMENT contracts where eqroProvisionMcoEqrOrRelatedActivities is true'
                )
            }
        }
    }

    return
}
