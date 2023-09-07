import type {
    HealthPlanRevisionType,
    HealthPlanPackageStatusType,
    HealthPlanPackageType,
} from './HealthPlanPackageType'
import { pruneDuplicateEmails } from '../emailer/formatters'
import type { ContractType, RateRevisionType } from './contractAndRates'
import type {
    RateInfoType,
    SubmissionDocument,
    UnlockedHealthPlanFormDataType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import {
    toProtoBuffer,
    toDomain,
} from '../../../app-web/src/common-code/proto/healthPlanFormDataProto'

// submissionStatus computes the current status of the submission based on
// the submit/unlock info on its revisions.
// These methods ASSUME that revisions are returned most-recent-first.
function packageStatus(
    pkg: HealthPlanPackageType
): HealthPlanPackageStatusType | Error {
    // Compute the current status of this submission based on the number of revisions.
    const currentRev = packageCurrentRevision(pkg)

    // draft - only one revision, no submission status
    // submitted - one revision with submission status
    if (pkg.revisions.length === 1) {
        if (currentRev.submitInfo) {
            return 'SUBMITTED'
        }
        return 'DRAFT'
    } else if (pkg.revisions.length > 1) {
        // unlocked - multiple revisions, latest revision has unlocked status and no submitted status
        // resubmitted - multiple revisions, latest revision has submitted status
        if (currentRev.submitInfo) {
            return 'RESUBMITTED'
        }
        return 'UNLOCKED'
    }

    return new Error('No revisions on this submission')
}

// submissionSubmittedAt returns the INITIAL submission date. Even if the
// submission has been unlocked and resubmitted the submission date is always the original submit date
// This method relies on revisions always being presented in most-recent-first order
function packageSubmittedAt(pkg: HealthPlanPackageType): Date | undefined {
    const lastSubmittedRev = pkg.revisions[pkg.revisions.length - 1]
    return lastSubmittedRev?.submitInfo?.updatedAt
}

// submissionCurrentRevision returns the most recent revision
// This method (and others here!) rely on revisions always being returned in most-recent-first order
function packageCurrentRevision(
    pkg: HealthPlanPackageType
): HealthPlanRevisionType {
    return pkg.revisions[0]
}

function packageSubmitters(pkg: HealthPlanPackageType): string[] {
    const submitters: string[] = []
    pkg.revisions.forEach(
        (revision) =>
            revision.submitInfo?.updatedBy &&
            submitters.push(revision.submitInfo?.updatedBy)
    )

    return pruneDuplicateEmails(submitters)
}

function convertContractToUnlockedHealthPlanPackage(
    contract: ContractType
): HealthPlanPackageType | Error {
    // Since drafts come in separate on the Contract type, we push it onto the revisions before converting below
    if (contract.draftRevision) {
        contract.revisions.unshift(contract.draftRevision)
    }

    const healthPlanRevisions =
        convertContractRevisionToHealthPlanRevision(contract)

    if (healthPlanRevisions instanceof Error) {
        return healthPlanRevisions
    }

    return {
        id: contract.id,
        stateCode: contract.stateCode,
        revisions: healthPlanRevisions,
    }
}

function convertContractRateRevisionToHealthPlanRevision(
    rateRevision: RateRevisionType
): RateInfoType {
    const { formData } = rateRevision

    const rateAmendmentInfo = (formData.amendmentEffectiveDateStart ||
        formData.amendmentEffectiveDateEnd) && {
        effectiveDateStart: formData.amendmentEffectiveDateStart,
        effectiveDateEnd: formData.amendmentEffectiveDateEnd,
    }

    return {
        id: rateRevision.id,
        rateType: formData.rateType,
        rateCapitationType: formData.rateCapitationType,
        rateDocuments: formData.rateDocuments?.length
            ? (formData.rateDocuments.map((doc) => ({
                  ...doc,
                  documentCategories: ['RATES'],
              })) as SubmissionDocument[])
            : [],
        supportingDocuments: formData.supportingDocuments?.length
            ? (formData.supportingDocuments.map((doc) => ({
                  ...doc,
                  documentCategories: ['RATES_RELATED'],
              })) as SubmissionDocument[])
            : [],
        rateDateStart: formData.rateDateStart,
        rateDateEnd: formData.rateDateEnd,
        rateDateCertified: formData.rateDateCertified,
        rateAmendmentInfo: rateAmendmentInfo,
        rateProgramIDs: formData.rateProgramIDs,
        rateCertificationName: formData.rateCertificationName,
        actuaryContacts: formData.certifyingActuaryContacts?.length
            ? formData.certifyingActuaryContacts
            : [],
        // From the TODO in convertContractRevisionToHealthPlanRevision, these can just be set as whatever is in the
        // database. The frontend does not read this values.
        actuaryCommunicationPreference: formData.actuaryCommunicationPreference,
        packagesWithSharedRateCerts: formData.packagesWithSharedRateCerts ?? [],
    }
}

function convertContractRevisionToHealthPlanRevision(
    contract: ContractType
): HealthPlanRevisionType[] | Error {
    if (contract.status !== 'DRAFT') {
        return new Error(
            `Contract with ID: ${contract.id} status is not "DRAFT". Cannot convert to unlocked health plan package`
        )
    }

    let healthPlanRevisions: HealthPlanRevisionType[] | Error = []

    // TODO: The frontend UI still thinks both these fields are on the contract level, but in the DB they are at
    //  the rate revision level. Since at update contract we are setting both fields in each rate using what the values
    //  on the contract level, when we pull data out from our new DB model, we need to do the inverse by using, the
    //  the first rates values.
    //  This will need to be updated and fixed when we figure out shared rates, because shared rates are not
    //  guaranteed to have the same values.
    const addtlActuaryCommunicationPreference =
        contract.draftRevision?.rateRevisions[0]?.formData
            ?.actuaryCommunicationPreference
    const addtlActuaryContacts =
        contract.draftRevision?.rateRevisions[0]?.formData
            ?.addtlActuaryContacts ?? []

    for (const contractRev of contract.revisions) {
        const unlockedHealthPlanFormData: UnlockedHealthPlanFormDataType = {
            id: contractRev.id,
            createdAt: contractRev.createdAt,
            updatedAt: contractRev.updatedAt,
            status: contract.status,
            stateCode: contract.stateCode,
            stateNumber: contract.stateNumber,
            programIDs: contractRev.formData.programIDs,
            populationCovered: contractRev.formData.populationCovered,
            submissionType: contractRev.formData.submissionType,
            riskBasedContract: contractRev.formData.riskBasedContract,
            submissionDescription: contractRev.formData.submissionDescription,
            stateContacts: contractRev.formData.stateContacts,
            addtlActuaryCommunicationPreference,
            addtlActuaryContacts,
            documents: contractRev.formData.supportingDocuments.map((doc) => ({
                ...doc,
                documentCategories: ['CONTRACT_RELATED'],
            })) as SubmissionDocument[],
            contractType: contractRev.formData.contractType,
            contractExecutionStatus:
                contractRev.formData.contractExecutionStatus,
            contractDocuments: contractRev.formData.contractDocuments.map(
                (doc) => ({
                    ...doc,
                    documentCategories: ['CONTRACT'],
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
                        contractRev.formData
                            .modifiedOtherFinancialPaymentIncentive,
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
            rateInfos: contractRev.rateRevisions.map((rateRevision) =>
                convertContractRateRevisionToHealthPlanRevision(rateRevision)
            ),
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

export {
    packageCurrentRevision,
    packageStatus,
    packageSubmittedAt,
    packageSubmitters,
    convertContractToUnlockedHealthPlanPackage,
}
