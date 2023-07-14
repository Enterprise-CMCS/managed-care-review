import {
    HealthPlanRevisionType,
    HealthPlanPackageStatusType,
    HealthPlanPackageType,
} from './HealthPlanPackageType'
import { pruneDuplicateEmails } from '../emailer/formatters'
import { Contract } from './contractAndRates/contractAndRatesZodSchema'
import {
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
    contract: Contract
): HealthPlanPackageType | Error {
    console.info('Attempting to convert contract to health plan package')

    try {
        const healthPlanRevisions =
            convertContractRevisionToHealthPlanRevision(contract)
        return {
            id: contract.id,
            stateCode: contract.stateCode,
            revisions: healthPlanRevisions,
        }
    } catch (err) {
        console.warn(
            `Error: convertContractToUnlockedHealthPlanPackage encountered an error: ${err.message}`
        )
        return err
    }
}

function convertContractRevisionToHealthPlanRevision(
    contract: Contract
): HealthPlanRevisionType[] {
    if (contract.status !== 'DRAFT') {
        throw new Error(
            'Contract status is not "DRAFT". Cannot convert to unlocked health plan package'
        )
    }

    const healthPlanRevisions: HealthPlanRevisionType[] = []
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
            addtlActuaryCommunicationPreference: undefined,
            addtlActuaryContacts: [],
            documents: contractRev.formData.supportingDocuments.map((doc) => ({
                ...doc,
                documentCategories: doc.documentCategories.filter(
                    (category) => category !== undefined
                ),
            })) as SubmissionDocument[],
            contractType: contractRev.formData.contractType,
            contractExecutionStatus:
                contractRev.formData.contractExecutionStatus,
            contractDocuments: contractRev.formData.contractDocuments.map(
                (doc) => ({
                    ...doc,
                    documentCategories: doc.documentCategories.filter(
                        (category) => category !== undefined
                    ),
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
            rateInfos: [],
        }

        const formDataProto = toProtoBuffer(unlockedHealthPlanFormData)

        // check that we can encode then decode with no issues
        const domainData = toDomain(formDataProto)

        if (domainData instanceof Error) {
            throw domainData
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
