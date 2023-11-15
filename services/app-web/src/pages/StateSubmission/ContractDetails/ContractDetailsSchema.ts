import * as Yup from 'yup'
import dayjs from 'dayjs'
import { validateDateFormat } from '../../../formHelpers'
import {
    isCHIPProvision,
    GeneralizedProvisionType,
    UnlockedHealthPlanFormDataType,
    federalAuthorityKeysForCHIP,
} from '../../../common-code/healthPlanFormDataType'
import {
    isBaseContract,
    isCHIPOnly,
    isContractAmendment,
    isContractWithProvisions,
} from '../../../common-code/healthPlanFormDataType/healthPlanFormData'
import {
    isMedicaidAmendmentProvision,
    isMedicaidBaseProvision,
} from '../../../common-code/healthPlanFormDataType/ModifiedProvisions'
import { FeatureFlagSettings } from '../../../common-code/featureFlags'

Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

export const ContractDetailsFormSchema = (
    draftSubmission: UnlockedHealthPlanFormDataType,
    activeFeatureFlags: FeatureFlagSettings = {}
) => {
    const yesNoError = (provision: GeneralizedProvisionType) => {
        const noValidation = Yup.string().nullable()
        const provisionValidiation = Yup.string().defined(
            'You must select yes or no'
        )
        if (!isContractWithProvisions(draftSubmission)) {
            return noValidation
        }
        if (isCHIPOnly(draftSubmission)) {
            return isCHIPProvision(provision)
                ? provisionValidiation
                : noValidation
        } else if (
            isBaseContract(draftSubmission) &&
            isMedicaidBaseProvision(provision)
        ) {
            return provisionValidiation
        } else if (
            isContractAmendment(draftSubmission) &&
            isMedicaidAmendmentProvision(provision)
        ) {
            return provisionValidiation
        } else {
            return noValidation
        }
    }

    // Errors in the error summary is ordered by the position of each ket in the yup object.
    return Yup.object().shape({
        statutoryRegulatoryAttestation: activeFeatureFlags['438-attestation']
            ? Yup.string().defined('You must select yes or no')
            : Yup.string(),
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
                return isCHIPOnly(draftSubmission)
                    ? federalAuthorityKeysForCHIP.some((requiredAuthority) =>
                          value?.includes(requiredAuthority)
                      )
                    : Boolean(value && value.length > 0)
            }
        ),
        inLieuServicesAndSettings: yesNoError('inLieuServicesAndSettings'),
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
