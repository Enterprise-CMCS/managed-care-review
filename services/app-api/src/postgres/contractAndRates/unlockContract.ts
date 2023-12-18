import type { PrismaClient } from '@prisma/client'
import type { ContractType } from '../../domain-models/contractAndRates'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'

type UnlockContractArgsType = {
    contractID: string
    unlockedByUserID: string
    unlockReason: string
}

// Unlock the given contract
// * copy form data
// * set relationships based on last submission
async function unlockContract(
    client: PrismaClient,
    args: UnlockContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const groupTime = new Date()

    const { contractID, unlockedByUserID, unlockReason } = args

    try {
        return await client.$transaction(async (tx) => {
            // Given all the Rates associated with this draft, find the most recent submitted
            // rateRevision to attach to this contract on submit.
            const currentRev = await tx.contractRevisionTable.findFirst({
                where: {
                    contractID: contractID,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    contractDocuments: {
                        orderBy: {
                            position: 'asc',
                        },
                    },
                    supportingDocuments: {
                        orderBy: {
                            position: 'asc',
                        },
                    },
                    stateContacts: {
                        orderBy: {
                            position: 'asc',
                        },
                    },

                    rateRevisions: {
                        where: {
                            validUntil: null,
                        },
                        include: {
                            rateRevision: true,
                        },
                    },
                },
            })
            if (!currentRev) {
                const err = `PRISMA ERROR: Cannot find the current revision to unlock with contract id: ${contractID}`
                console.error(err)
                return new NotFoundError(err)
            }

            if (!currentRev.submitInfoID) {
                console.error(
                    'Programming Error: cannot unlock a already unlocked contract'
                )
                return new Error(
                    'Programming Error: cannot unlock a already unlocked contract'
                )
            }

            const previouslySubmittedRateIDs = currentRev.rateRevisions.map(
                (c) => c.rateRevision.rateID
            )

            await tx.contractRevisionTable.create({
                data: {
                    contract: {
                        connect: {
                            id: contractID,
                        },
                    },
                    unlockInfo: {
                        create: {
                            updatedAt: groupTime,
                            updatedByID: unlockedByUserID,
                            updatedReason: unlockReason,
                        },
                    },
                    draftRates: {
                        connect: previouslySubmittedRateIDs.map((cID) => ({
                            id: cID,
                        })),
                    },

                    populationCovered: currentRev.populationCovered,
                    programIDs: currentRev.programIDs,
                    riskBasedContract: currentRev.riskBasedContract,
                    submissionType: currentRev.submissionType,
                    submissionDescription: currentRev.submissionDescription,
                    contractType: currentRev.contractType,
                    contractExecutionStatus: currentRev.contractExecutionStatus,
                    contractDateStart: currentRev.contractDateStart,
                    contractDateEnd: currentRev.contractDateEnd,
                    managedCareEntities: currentRev.managedCareEntities,
                    federalAuthorities: currentRev.federalAuthorities,
                    inLieuServicesAndSettings:
                        currentRev.inLieuServicesAndSettings,
                    modifiedBenefitsProvided:
                        currentRev.modifiedBenefitsProvided,
                    modifiedGeoAreaServed: currentRev.modifiedGeoAreaServed,
                    modifiedMedicaidBeneficiaries:
                        currentRev.modifiedMedicaidBeneficiaries,
                    modifiedRiskSharingStrategy:
                        currentRev.modifiedRiskSharingStrategy,
                    modifiedIncentiveArrangements:
                        currentRev.modifiedIncentiveArrangements,
                    modifiedWitholdAgreements:
                        currentRev.modifiedWitholdAgreements,
                    modifiedStateDirectedPayments:
                        currentRev.modifiedStateDirectedPayments,
                    modifiedPassThroughPayments:
                        currentRev.modifiedPassThroughPayments,
                    modifiedPaymentsForMentalDiseaseInstitutions:
                        currentRev.modifiedPaymentsForMentalDiseaseInstitutions,
                    modifiedMedicalLossRatioStandards:
                        currentRev.modifiedMedicalLossRatioStandards,
                    modifiedOtherFinancialPaymentIncentive:
                        currentRev.modifiedOtherFinancialPaymentIncentive,
                    modifiedEnrollmentProcess:
                        currentRev.modifiedEnrollmentProcess,
                    modifiedGrevienceAndAppeal:
                        currentRev.modifiedGrevienceAndAppeal,
                    modifiedNetworkAdequacyStandards:
                        currentRev.modifiedNetworkAdequacyStandards,
                    modifiedLengthOfContract:
                        currentRev.modifiedLengthOfContract,
                    modifiedNonRiskPaymentArrangements:
                        currentRev.modifiedNonRiskPaymentArrangements,
                    statutoryRegulatoryAttestation:
                        currentRev.statutoryRegulatoryAttestation,
                    statutoryRegulatoryAttestationDescription:
                        currentRev.statutoryRegulatoryAttestationDescription,

                    contractDocuments: {
                        create: currentRev.contractDocuments.map((d) => ({
                            position: d.position,
                            name: d.name,
                            s3URL: d.s3URL,
                            sha256: d.sha256,
                        })),
                    },
                    supportingDocuments: {
                        create: currentRev.supportingDocuments.map((d) => ({
                            position: d.position,
                            name: d.name,
                            s3URL: d.s3URL,
                            sha256: d.sha256,
                        })),
                    },
                    stateContacts: {
                        create: currentRev.stateContacts.map((c) => ({
                            position: c.position,
                            name: c.name,
                            email: c.email,
                            titleRole: c.titleRole,
                        })),
                    },
                },
                include: {
                    rateRevisions: {
                        include: {
                            rateRevision: true,
                        },
                    },
                },
            })

            return findContractWithHistory(tx, contractID)
        })
    } catch (err) {
        console.error('UNLOCK PRISMA CONTRACT ERR', err)
        return err
    }
}

export { unlockContract }
export type { UnlockContractArgsType }
