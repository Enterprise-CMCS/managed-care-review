import * as Yup from 'yup'
import dayjs from 'dayjs'
import { validateDateFormat } from '../../../../formHelpers'
import { UnlockedContract } from '../../../../gen/gqlClient'
import { validateFileItemsList } from '../../../../formHelpers'

Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

export const EQROContractDetailsFormSchema = (
    draftSubmission: UnlockedContract
) => {
    // Helper function to determine if EQRO provision fields are required
    const eqroProvisionValidation = (fieldName: string) => {
        // Get contract type and managed care entities from draft
        const contractType =
            draftSubmission?.draftRevision?.formData?.contractType ?? ''
        const isBase = contractType.includes('BASE')
        const managedCareEntities =
            draftSubmission?.draftRevision?.formData?.managedCareEntities ?? []
        const hasMCO = managedCareEntities.includes('MCO')

        // Validation rules based on the form logic:
        // - eqroNewContractor: required if base contract AND MCO
        // - eqroProvisionMcoEqrOrRelatedActivities: required if NOT base contract AND MCO
        // - eqroProvisionMcoNewOptionalActivity: required if (base contract AND MCO) OR (amendment AND MCO AND answered YES to EQR activities)
        // - eqroProvisionNewMcoEqrRelatedActivities: same as above

        if (fieldName === 'eqroNewContractor') {
            return isBase && hasMCO
                ? Yup.string().defined('You must select yes or no')
                : Yup.string().notRequired()
        }

        if (fieldName === 'eqroProvisionMcoEqrOrRelatedActivities') {
            return !isBase && hasMCO
                ? Yup.string().defined('You must select yes or no')
                : Yup.string().notRequired()
        }

        if (
            fieldName === 'eqroProvisionMcoNewOptionalActivity' ||
            fieldName === 'eqroProvisionNewMcoEqrRelatedActivities'
        ) {
            // These are shown when:
            // 1. Base contract with MCO, OR
            // 2. Amendment with MCO and answered YES to eqroProvisionMcoEqrOrRelatedActivities

            // For validation, we use conditional validation based on the parent question
            return Yup.string().when('eqroProvisionMcoEqrOrRelatedActivities', {
                is: (eqroProvisionAnswer: string) => {
                    // Required if base contract with MCO
                    if (isBase && hasMCO) return true
                    // Required if amendment with MCO and answered YES
                    if (!isBase && hasMCO && eqroProvisionAnswer === 'YES')
                        return true
                    return false
                },
                then: (schema) => schema.defined('You must select yes or no'),
                otherwise: (schema) => schema.notRequired(),
            })
        }

        if (fieldName === 'eqroProvisionChipEqrRelatedActivities') {
            const populationCovered =
                draftSubmission?.draftRevision?.formData?.populationCovered ??
                ''
            const isChip = populationCovered.includes('CHIP')
            return isChip
                ? Yup.string().defined('You must select yes or no')
                : Yup.string().notRequired()
        }

        return Yup.string().notRequired()
    }

    // Errors in the error summary are ordered by the position of each key in the yup object.
    return Yup.object().shape({
        contractDocuments: validateFileItemsList({ required: true }),
        supportingDocuments: validateFileItemsList({ required: false }),
        contractDateStart: Yup.date()
            // @ts-ignore-next-line
            .validateDateFormat('YYYY-MM-DD', true)
            .typeError(
                'The start date must be in MM/DD/YYYY format, like 01/01/2030'
            )
            .defined('You must enter a start date'),
        contractDateEnd: Yup.date()
            // @ts-ignore-next-line
            .validateDateFormat('YYYY-MM-DD', true)
            .typeError(
                'The end date must be in MM/DD/YYYY format, like 01/01/2030'
            )
            .defined('You must enter an end date')
            .when(
                // ContractDateEnd must be at minimum the day after Start
                'contractDateStart',
                (contractDateStart: Date, schema: Yup.DateSchema) => {
                    const startDate = dayjs(contractDateStart)
                    if (startDate.isValid()) {
                        return schema.min(
                            startDate.add(1, 'day'),
                            'The end date must come after the start date'
                        )
                    }
                }
            ),
        eqroNewContractor: eqroProvisionValidation('eqroNewContractor'),
        eqroProvisionMcoEqrOrRelatedActivities: eqroProvisionValidation(
            'eqroProvisionMcoEqrOrRelatedActivities'
        ),
        eqroProvisionMcoNewOptionalActivity: eqroProvisionValidation(
            'eqroProvisionMcoNewOptionalActivity'
        ),
        eqroProvisionNewMcoEqrRelatedActivities: eqroProvisionValidation(
            'eqroProvisionNewMcoEqrRelatedActivities'
        ),
        eqroProvisionChipEqrRelatedActivities: eqroProvisionValidation(
            'eqroProvisionChipEqrRelatedActivities'
        ),
    })
}
