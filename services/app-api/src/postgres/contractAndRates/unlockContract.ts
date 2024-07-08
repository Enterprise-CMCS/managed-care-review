import type { PrismaClient } from '@prisma/client'
import type { UnlockedContractType } from '../../domain-models/contractAndRates'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import { unlockRateInDB } from './unlockRate'
import type { PrismaTransactionType } from '../prismaTypes'

async function unlockContractInTransaction(
    tx: PrismaTransactionType,
    args: UnlockContractArgsType
): Promise<UnlockedContractType | Error> {
    const currentDateTime = new Date()
    const { contractID, unlockedByUserID, unlockReason } = args
    // create the unlock info to be shared across all submissions.
    const unlockInfo = await tx.updateInfoTable.create({
        data: {
            updatedAt: currentDateTime,
            updatedByID: unlockedByUserID,
            updatedReason: unlockReason,
        },
    })

    // get the last submitted rev in order to unlock it
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

            relatedSubmisions: {
                orderBy: {
                    updatedAt: 'desc',
                },
                take: 1,
                include: {
                    submissionPackages: {
                        include: {
                            rateRevision: true,
                        },
                        orderBy: {
                            ratePosition: 'asc',
                        },
                    },
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

    const childRateIDs: string[] = []
    // This finds the child rates for this submission.
    // A child rate is a rate that shares a submit info with this contract.
    // technically only a rate that is _initially_ submitted with a contract
    // is a child rate, but we should never allow re-submission so this simpler
    // query that doesn't try to filter to initial revisions works.
    const childRates = await tx.rateTable.findMany({
        where: {
            revisions: {
                some: {
                    submitInfo: {
                        submittedContracts: {
                            some: {
                                contractID: contractID,
                            },
                        },
                    },
                },
            },
        },
    })

    // only unlock children that were submitted in the latest submission
    const submissionPackageEntries =
        currentRev.relatedSubmisions[0].submissionPackages

    for (const childRate of childRates) {
        if (
            submissionPackageEntries.some(
                (p) => p.rateRevision.rateID === childRate.id
            )
        ) {
            childRateIDs.push(childRate.id)
        }
    }

    // unlock child rates with that unlock info
    for (const childRateID of childRateIDs) {
        const unlockRate = await unlockRateInDB(tx, childRateID, unlockInfo.id)
        if (unlockRate instanceof Error) {
            return unlockRate
        }
    }

    const relatedRateIDs: string[] = []
    // find the rates in the last submission package:
    const lastSubmission = currentRev.relatedSubmisions[0]
    const thisContractsRatePackages = lastSubmission.submissionPackages.filter(
        (p) => p.contractRevisionID === currentRev.id
    )

    for (const ratePackage of thisContractsRatePackages) {
        relatedRateIDs.push(ratePackage.rateRevision.rateID)
    }

    await tx.contractRevisionTable.create({
        data: {
            contract: {
                connect: {
                    id: contractID,
                },
            },
            unlockInfo: {
                connect: { id: unlockInfo.id },
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
            inLieuServicesAndSettings: currentRev.inLieuServicesAndSettings,
            modifiedBenefitsProvided: currentRev.modifiedBenefitsProvided,
            modifiedGeoAreaServed: currentRev.modifiedGeoAreaServed,
            modifiedMedicaidBeneficiaries:
                currentRev.modifiedMedicaidBeneficiaries,
            modifiedRiskSharingStrategy: currentRev.modifiedRiskSharingStrategy,
            modifiedIncentiveArrangements:
                currentRev.modifiedIncentiveArrangements,
            modifiedWitholdAgreements: currentRev.modifiedWitholdAgreements,
            modifiedStateDirectedPayments:
                currentRev.modifiedStateDirectedPayments,
            modifiedPassThroughPayments: currentRev.modifiedPassThroughPayments,
            modifiedPaymentsForMentalDiseaseInstitutions:
                currentRev.modifiedPaymentsForMentalDiseaseInstitutions,
            modifiedMedicalLossRatioStandards:
                currentRev.modifiedMedicalLossRatioStandards,
            modifiedOtherFinancialPaymentIncentive:
                currentRev.modifiedOtherFinancialPaymentIncentive,
            modifiedEnrollmentProcess: currentRev.modifiedEnrollmentProcess,
            modifiedGrevienceAndAppeal: currentRev.modifiedGrevienceAndAppeal,
            modifiedNetworkAdequacyStandards:
                currentRev.modifiedNetworkAdequacyStandards,
            modifiedLengthOfContract: currentRev.modifiedLengthOfContract,
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
    })

    // connect draftRates
    let position = 1
    const joins = relatedRateIDs.map((id) => {
        const thisPosition = position
        position++
        return {
            contractID: currentRev.contractID,
            rateID: id,
            ratePosition: thisPosition,
        }
    })

    await tx.draftRateJoinTable.createMany({
        data: joins,
        skipDuplicates: true,
    })

    const contract = await findContractWithHistory(tx, contractID)
    if (contract instanceof Error) {
        return contract
    }
    if (!contract.draftRevision) {
        return new Error('Unlocked Contract is missing draft revision')
    }
    const unlockedContract: UnlockedContractType = {
        ...contract,
        draftRevision: contract.draftRevision,
    }
    return unlockedContract
}

type UnlockContractArgsType = {
    contractID: string
    unlockedByUserID: string
    unlockReason: string
}

// Unlock the given contract
// * unlock child rates
// * copy form data
// * set relationships based on last submission
async function unlockContract(
    client: PrismaClient,
    args: UnlockContractArgsType
): Promise<UnlockedContractType | NotFoundError | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const result = await unlockContractInTransaction(tx, args)
            if (result instanceof Error) {
                throw result
            }

            return result
        })
    } catch (err) {
        console.error('UNLOCK PRISMA CONTRACT ERR', err)
        return err
    }
}

export { unlockContract }
export type { UnlockContractArgsType }
