import * as Yup from 'yup'
import dayjs from 'dayjs'
import { validateDateFormat } from '../../../formHelpers'
import {
    allowedProvisionsForCHIP,
    ProvisionType,
} from '../../../common-code/healthPlanFormDataType'

Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

export const ContractDetailsFormSchema = (
    isContractAmendment: boolean,
    isCHIPOnly: boolean
) => {
    const ignoreFieldForCHIP = (string: ProvisionType) => {
        return isCHIPOnly && !allowedProvisionsForCHIP.includes(string)
    }

    const yesNoError = (provision: ProvisionType) => {
        const noValidation = Yup.string().nullable()
        if (!isContractAmendment) {
            return noValidation
        }

        if (ignoreFieldForCHIP(provision)) {
            return noValidation
        }

        return Yup.string().defined('You must select yes or no')
    }

    return Yup.object().shape({
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

        modifiedBenefitsProvided: yesNoError('modifiedBenefitsProvided'),
        modifiedGeoAreaServed: yesNoError('modifiedGeoAreaServed'),
        modifiedMedicaidBeneficiaries: yesNoError(
            'modifiedMedicaidBeneficiaries'
        ),
        modifiedRiskSharingStrategy: yesNoError('modifiedRiskSharingStrategy'),
        modifiedIncentiveArrangements: yesNoError(
            'modifiedIncentiveArrangements'
        ),
        modifiedWitholdAgreements: yesNoError('modifiedWitholdAgreements'),
        modifiedStateDirectedPayments: yesNoError(
            'modifiedStateDirectedPayments'
        ),
        modifiedPassThroughPayments: yesNoError('modifiedPassThroughPayments'),
        modifiedPaymentsForMentalDiseaseInstitutions: yesNoError(
            'modifiedPaymentsForMentalDiseaseInstitutions'
        ),
        modifiedMedicalLossRatioStandards: yesNoError(
            'modifiedMedicalLossRatioStandards'
        ),
        modifiedOtherFinancialPaymentIncentive: yesNoError(
            'modifiedOtherFinancialPaymentIncentive'
        ),
        modifiedEnrollmentProcess: yesNoError('modifiedEnrollmentProcess'),
        modifiedGrevienceAndAppeal: yesNoError('modifiedGrevienceAndAppeal'),
        modifiedNetworkAdequacyStandards: yesNoError(
            'modifiedNetworkAdequacyStandards'
        ),
        modifiedLengthOfContract: yesNoError('modifiedLengthOfContract'),
        modifiedNonRiskPaymentArrangements: yesNoError(
            'modifiedNonRiskPaymentArrangements'
        ),
    })
}
