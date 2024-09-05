import type {
    HealthPlanFormDataType,
    RateInfoType,
    SubmissionDocument,
} from '@mc-review/hpp'
import type {
    HealthPlanPackageType,
    HealthPlanRevisionType,
} from '../HealthPlanPackageType'
import type { ContractType } from './contractTypes'
import { toDomain, toProtoBuffer } from '@mc-review/hpp'
import { parsePartialHPFD } from '@mc-review/hpp'
import type { PartialHealthPlanFormData } from '@mc-review/hpp'
import type { ContractRevisionType, RateRevisionType } from './revisionTypes'

function convertContractToDraftRateRevisions(contract: ContractType) {
    const rateRevisions: RateRevisionType[] = []
    contract.draftRates?.forEach((rate) => {
        if (rate.draftRevision) {
            rateRevisions.push(rate.draftRevision)
        } else if (rate.revisions.length > 0) {
            rateRevisions.push(rate.revisions[0])
        }
    })
    return rateRevisions
}

function convertContractWithRatesToUnlockedHPP(
    contract: ContractType
): HealthPlanPackageType | Error {
    // Since drafts come in separate on the Contract type, we push it onto the revisions before converting below
    if (contract.draftRevision) {
        const rateRevisions = convertContractToDraftRateRevisions(contract)
        contract.revisions.unshift({ ...contract.draftRevision, rateRevisions })
    }

    const healthPlanRevisions = convertContractWithRatesRevtoHPPRev(contract)

    if (healthPlanRevisions instanceof Error) {
        return healthPlanRevisions
    }

    return {
        id: contract.id,
        stateCode: contract.stateCode,
        mccrsID: contract.mccrsID,
        revisions: healthPlanRevisions,
    }
}

function convertContractWithRatesRevtoHPPRev(
    contract: ContractType
): HealthPlanRevisionType[] | Error {
    let healthPlanRevisions: HealthPlanRevisionType[] | Error = []
    for (const contractRev of contract.revisions) {
        const unlockedHealthPlanFormData = convertContractWithRatesToFormData(
            contractRev,
            contractRev.rateRevisions,
            contract.id,
            contract.stateCode,
            contract.stateNumber
        )

        if (unlockedHealthPlanFormData instanceof Error) {
            return unlockedHealthPlanFormData
        }

        const formDataProto = toProtoBuffer(unlockedHealthPlanFormData)

        // check that we can encode then decode with no issues
        const domainData = toDomain(formDataProto)

        // If any revision has en error in decoding we break the loop and return an error
        if (domainData instanceof Error) {
            healthPlanRevisions = new Error(
                `Could not convert contract revision with ID: ${contractRev.id} to health plan package revision: ${domainData}`
            )
            break
        }

        const healthPlanRevision: HealthPlanRevisionType = {
            id: contractRev.id,
            unlockInfo: contractRev.unlockInfo,
            submitInfo: contractRev.submitInfo,
            createdAt: contractRev.createdAt,
            formDataProto,
        }

        healthPlanRevisions.push(healthPlanRevision)
    }

    return healthPlanRevisions
}

function convertContractWithRatesToFormData(
    contractRev: ContractRevisionType,
    rateRevisions: RateRevisionType[],
    contractID: string,
    stateCode: string,
    stateNumber: number
): HealthPlanFormDataType | Error {
    const rateInfos: RateInfoType[] = rateRevisions.map((rateRev) => {
        const {
            rateType,
            rateCapitationType,
            rateCertificationName,
            rateDateCertified,
            rateDateEnd,
            rateDateStart,
            rateDocuments = [],
            supportingDocuments = [],
            rateProgramIDs,
            packagesWithSharedRateCerts,
            certifyingActuaryContacts = [],
            addtlActuaryContacts = [],
            amendmentEffectiveDateEnd,
            amendmentEffectiveDateStart,
            actuaryCommunicationPreference,
        } = rateRev.formData

        const rateAmendmentInfo = (amendmentEffectiveDateStart ||
            amendmentEffectiveDateEnd) && {
            effectiveDateStart: amendmentEffectiveDateStart,
            effectiveDateEnd: amendmentEffectiveDateEnd,
        }
        return {
            id: rateRev.formData.rateID, // the rateInfo id needs to be the top level rate id
            rateType,
            rateCapitationType,
            rateDocuments: rateDocuments.map((doc) => ({
                ...doc,
            })) as SubmissionDocument[],
            supportingDocuments: supportingDocuments.map((doc) => ({
                ...doc,
            })) as SubmissionDocument[],
            rateAmendmentInfo: rateAmendmentInfo,
            rateDateStart,
            rateDateEnd,
            rateDateCertified,
            rateProgramIDs,
            rateCertificationName,
            actuaryContacts: certifyingActuaryContacts ?? [],
            addtlActuaryContacts: addtlActuaryContacts ?? [],
            actuaryCommunicationPreference,
            packagesWithSharedRateCerts,
        }
    })

    // since this data is coming out from the DB without validation, we start by making a draft.
    const healthPlanFormData: PartialHealthPlanFormData = {
        id: contractID, // contract form data id is the contract ID.
        createdAt: contractRev.createdAt,
        updatedAt: contractRev.updatedAt,
        stateCode: stateCode,
        stateNumber: stateNumber,
        programIDs: contractRev.formData.programIDs,
        populationCovered: contractRev.formData.populationCovered,
        submissionType: contractRev.formData.submissionType,
        riskBasedContract: contractRev.formData.riskBasedContract,
        submissionDescription: contractRev.formData.submissionDescription,
        stateContacts: contractRev.formData.stateContacts,
        documents: contractRev.formData.supportingDocuments.map((doc) => ({
            ...doc,
        })) as SubmissionDocument[],
        contractType: contractRev.formData.contractType,
        contractExecutionStatus: contractRev.formData.contractExecutionStatus,
        contractDocuments: contractRev.formData.contractDocuments.map(
            (doc) => ({
                ...doc,
            })
        ) as SubmissionDocument[],
        contractDateStart: contractRev.formData.contractDateStart,
        contractDateEnd: contractRev.formData.contractDateEnd,
        managedCareEntities: contractRev.formData.managedCareEntities,
        federalAuthorities: contractRev.formData.federalAuthorities,
        contractAmendmentInfo: {
            modifiedProvisions: {
                inLieuServicesAndSettings:
                    contractRev.formData.inLieuServicesAndSettings,
                modifiedBenefitsProvided:
                    contractRev.formData.modifiedBenefitsProvided,
                modifiedGeoAreaServed:
                    contractRev.formData.modifiedGeoAreaServed,
                modifiedMedicaidBeneficiaries:
                    contractRev.formData.modifiedMedicaidBeneficiaries,
                modifiedRiskSharingStrategy:
                    contractRev.formData.modifiedRiskSharingStrategy,
                modifiedIncentiveArrangements:
                    contractRev.formData.modifiedIncentiveArrangements,
                modifiedWitholdAgreements:
                    contractRev.formData.modifiedWitholdAgreements,
                modifiedStateDirectedPayments:
                    contractRev.formData.modifiedStateDirectedPayments,
                modifiedPassThroughPayments:
                    contractRev.formData.modifiedPassThroughPayments,
                modifiedPaymentsForMentalDiseaseInstitutions:
                    contractRev.formData
                        .modifiedPaymentsForMentalDiseaseInstitutions,
                modifiedMedicalLossRatioStandards:
                    contractRev.formData.modifiedMedicalLossRatioStandards,
                modifiedOtherFinancialPaymentIncentive:
                    contractRev.formData.modifiedOtherFinancialPaymentIncentive,
                modifiedEnrollmentProcess:
                    contractRev.formData.modifiedEnrollmentProcess,
                modifiedGrevienceAndAppeal:
                    contractRev.formData.modifiedGrevienceAndAppeal,
                modifiedNetworkAdequacyStandards:
                    contractRev.formData.modifiedNetworkAdequacyStandards,
                modifiedLengthOfContract:
                    contractRev.formData.modifiedLengthOfContract,
                modifiedNonRiskPaymentArrangements:
                    contractRev.formData.modifiedNonRiskPaymentArrangements,
            },
        },
        /**
         * addtlActuaryCommunicationPreference and addtlActuaryContacts are unused. Leaving cleanup for a standalone PR
         * as there will be many broken tests.
         */
        addtlActuaryCommunicationPreference: undefined,
        addtlActuaryContacts: [],
        statutoryRegulatoryAttestation:
            contractRev.formData.statutoryRegulatoryAttestation,
        statutoryRegulatoryAttestationDescription:
            contractRev.formData.statutoryRegulatoryAttestationDescription,
        rateInfos,
    }

    const status = contractRev.submitInfo ? 'SUBMITTED' : 'DRAFT'
    if (contractRev.submitInfo) {
        healthPlanFormData.submittedAt = contractRev.submitInfo.updatedAt
    }

    const formDataResult = parsePartialHPFD(status, healthPlanFormData)

    if (formDataResult instanceof Error) {
        console.error('couldnt parse into valid form data', formDataResult)
    }

    return formDataResult
}

export {
    convertContractWithRatesRevtoHPPRev,
    convertContractWithRatesToUnlockedHPP,
    convertContractWithRatesToFormData,
    convertContractToDraftRateRevisions,
}
