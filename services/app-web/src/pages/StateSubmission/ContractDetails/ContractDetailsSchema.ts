import * as Yup from 'yup'
import dayjs from 'dayjs'
import { validateDateFormat } from '../../../formHelpers'
import { ContractType } from '../../../common-code/healthPlanFormDataType'

Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

const yesNoError = (contractType: ContractType) => {
    return Yup.string().test(
        'yesORno',
        'You must select yes or no',
        (value) => {
            // true means 'is valid' and no error is shown; not a one-liner for clarity
            if (contractType === 'BASE') {
                return true
            } else {
                return value !== undefined
            }
        }
    )
}

// Formik setup
export const ContractDetailsFormSchema = (contractType: ContractType) =>
    Yup.object().shape({
        contractExecutionStatus: Yup.string().defined(
            'You must select a contract status'
        ),
        contractDateStart: Yup.date()
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore-next-line
            .validateDateFormat('YYYY-MM-DD', true)
            .typeError('The start date must be in MM/DD/YYYY format')
            .defined('You must enter a start date'),

        contractDateEnd: Yup.date()
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore-next-line
            .validateDateFormat('YYYY-MM-DD', true)
            .typeError('The end date must be in MM/DD/YYYY format')
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

        managedCareEntities: Yup.array().test(
            'entitySelection',
            'You must select at least one entity',
            (value) => {
                return Boolean(value && value.length > 0)
            }
        ),
        federalAuthorities: Yup.array().test(
            'authoritySelection',
            'You must select at least one authority',
            (value) => {
                return Boolean(value && value.length > 0)
            }
        ),

        modifiedBenefitsProvided: yesNoError(contractType),
        modifiedGeoAreaServed: yesNoError(contractType),
        modifiedMedicaidBeneficiaries: yesNoError(contractType),
        modifiedRiskSharingStrategy: yesNoError(contractType),
        modifiedIncentiveArrangements: yesNoError(contractType),
        modifiedWitholdAgreements: yesNoError(contractType),
        modifiedStateDirectedPayments: yesNoError(contractType),
        modifiedPassThroughPayments: yesNoError(contractType),
        modifiedPaymentsForMentalDiseaseInstitutions: yesNoError(contractType),
        modifiedMedicalLossRatioStandards: yesNoError(contractType),
        modifiedOtherFinancialPaymentIncentive: yesNoError(contractType),
        modifiedEnrollmentProcess: yesNoError(contractType),
        modifiedGrevienceAndAppeal: yesNoError(contractType),
        modifiedNetworkAdequacyStandards: yesNoError(contractType),
        modifiedLengthOfContract: yesNoError(contractType),
        modifiedNonRiskPaymentArrangements: yesNoError(contractType),
    })
