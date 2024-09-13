import type {
    RateInfoType,
    UnlockedHealthPlanFormDataType,
} from '@mc-review/hpp'
import type {
    ContractFormData,
    RateFormData,
    RateFormDataInput,
} from '../../gen/gqlServer'
import dayjs from 'dayjs'

// interim solution -this file was made to deal with test helpers that may expect contract rates when we only have HPP coming from another test helper

// convertRateInfoToRateFormData converts a proto style RateInfo into a RateFormData type
function convertRateInfoToRateFormData(
    rateInfos: RateInfoType[]
): RateFormData[] {
    const rates = rateInfos.map((rateInfo): RateFormData => {
        const {
            rateType,
            rateCapitationType,
            rateCertificationName,
            rateDateCertified,
            rateDateEnd,
            rateDateStart,
            rateDocuments = [],
            supportingDocuments = [],
            rateProgramIDs = [],
            addtlActuaryContacts = [],
            actuaryCommunicationPreference,
        } = rateInfo

        return {
            rateType,
            rateCapitationType,
            rateCertificationName,
            rateDateCertified: dayjs(rateDateCertified).format('YYYY-MM-DD'),
            rateDateEnd: dayjs(rateDateEnd).format('YYYY-MM-DD'),
            rateDateStart: dayjs(rateDateStart).format('YYYY-MM-DD'),
            rateDocuments,
            supportingDocuments,
            rateProgramIDs,
            certifyingActuaryContacts: [rateInfo.actuaryContacts[0]],
            deprecatedRateProgramIDs: [], //ignore this deprecated field
            packagesWithSharedRateCerts: [], // ignore this depårecated field
            addtlActuaryContacts,
            actuaryCommunicationPreference,
        }
    })
    return rates
}

// convertRateInfoToRateFormData converts a proto style RateInfo into a RateFormData type
function convertRateInfoToRateFormDataInput(
    rateInfos: RateInfoType[]
): RateFormDataInput[] {
    const rates = rateInfos.map((rateInfo): RateFormDataInput => {
        const {
            rateType,
            rateCapitationType,
            rateCertificationName,
            rateDateCertified,
            rateDateEnd,
            rateDateStart,
            rateDocuments = [],
            supportingDocuments = [],
            rateProgramIDs = [],
            addtlActuaryContacts = [],
            actuaryCommunicationPreference,
        } = rateInfo

        return {
            rateType,
            rateCapitationType,
            rateCertificationName,
            rateDateCertified: dayjs(rateDateCertified)
                .utc()
                .format('YYYY-MM-DD'),
            rateDateEnd: dayjs(rateDateEnd).utc().format('YYYY-MM-DD'),
            rateDateStart: dayjs(rateDateStart).utc().format('YYYY-MM-DD'),
            rateDocuments,
            supportingDocuments,
            rateProgramIDs,
            certifyingActuaryContacts: rateInfo.actuaryContacts,
            deprecatedRateProgramIDs: [], //ignore this deprecated field
            addtlActuaryContacts,
            actuaryCommunicationPreference,
        }
    })
    return rates
}

// Take a HPP domain model and return form datas we can use in contract or rate test helpers
// if there are no rates on this contract, return null
const convertUnlockedHPPToContractAndRates = (
    pkg: UnlockedHealthPlanFormDataType
): [ContractFormData, RateFormData[]] => {
    const {
        submissionType,
        submissionDescription,
        stateContacts,
        contractType,
        contractExecutionStatus,
        contractDateStart,
        contractDateEnd,
        contractDocuments,
        managedCareEntities,
        federalAuthorities,
        populationCovered,
        statutoryRegulatoryAttestation,
        statutoryRegulatoryAttestationDescription,
        programIDs,
        documents,
    } = pkg

    const contractFormData: ContractFormData = {
        submissionType,
        submissionDescription,
        stateContacts,
        contractType,
        contractExecutionStatus,
        contractDateStart: dayjs(contractDateStart).format('YYYY-MM-DD'),
        contractDateEnd: dayjs(contractDateEnd).format('YYYY-MM-DD'),
        programIDs,
        contractDocuments,
        supportingDocuments: documents,
        managedCareEntities,
        federalAuthorities,
        populationCovered,
        inLieuServicesAndSettings:
            pkg.contractAmendmentInfo?.modifiedProvisions
                .inLieuServicesAndSettings,
        modifiedRiskSharingStrategy:
            pkg.contractAmendmentInfo?.modifiedProvisions
                .modifiedRiskSharingStrategy,
        modifiedIncentiveArrangements:
            pkg.contractAmendmentInfo?.modifiedProvisions
                .modifiedIncentiveArrangements,
        modifiedWitholdAgreements:
            pkg.contractAmendmentInfo?.modifiedProvisions
                .modifiedWitholdAgreements,
        modifiedStateDirectedPayments:
            pkg.contractAmendmentInfo?.modifiedProvisions
                .modifiedStateDirectedPayments,
        modifiedPassThroughPayments:
            pkg.contractAmendmentInfo?.modifiedProvisions
                .modifiedPassThroughPayments,
        modifiedPaymentsForMentalDiseaseInstitutions:
            pkg.contractAmendmentInfo?.modifiedProvisions
                .modifiedPaymentsForMentalDiseaseInstitutions,
        modifiedNonRiskPaymentArrangements:
            pkg.contractAmendmentInfo?.modifiedProvisions
                .modifiedNonRiskPaymentArrangements,
        statutoryRegulatoryAttestation,
        statutoryRegulatoryAttestationDescription,
    }
    const rateFormDatas: RateFormData[] = pkg.rateInfos.map(
        (rateInfo): RateFormData => {
            const {
                rateType,
                rateCapitationType,
                rateCertificationName,
                rateDateCertified,
                rateDateEnd,
                rateDateStart,
                rateDocuments = [],
                supportingDocuments = [],
                rateProgramIDs = [],
                addtlActuaryContacts = [],
                actuaryCommunicationPreference,
            } = rateInfo

            return {
                rateType,
                rateCapitationType,
                rateCertificationName,
                rateDateCertified:
                    dayjs(rateDateCertified).format('YYYY-MM-DD'),
                rateDateEnd: dayjs(rateDateEnd).format('YYYY-MM-DD'),
                rateDateStart: dayjs(rateDateStart).format('YYYY-MM-DD'),
                rateDocuments,
                supportingDocuments,
                rateProgramIDs,
                certifyingActuaryContacts: [rateInfo.actuaryContacts[0]],
                deprecatedRateProgramIDs: [], //ignore this deprecated field
                packagesWithSharedRateCerts: [], // ignore this depårecated field
                addtlActuaryContacts,
                actuaryCommunicationPreference,
            }
        }
    )

    return [contractFormData, rateFormDatas]
}

export {
    convertUnlockedHPPToContractAndRates,
    convertRateInfoToRateFormData,
    convertRateInfoToRateFormDataInput,
}
