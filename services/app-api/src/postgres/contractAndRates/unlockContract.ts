import type { UnlockedContractType } from '../../domain-models'
import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import { unlockRateInDB } from './unlockRate'
import type { PrismaTransactionType } from '../prismaTypes'
import type { ExtendedPrismaClient } from '../prismaClient'

async function unlockContractInsideTransaction(
    tx: PrismaTransactionType,
    args: UnlockContractArgsType
): Promise<UnlockedContractType | Error> {
    const currentDateTime = new Date()
    const { contractID, unlockedByUserID, unlockReason, manualCreatedAt } = args
    // create the unlock info to be shared across all submissions.
    const unlockInfo = await tx.updateInfoTable.create({
        data: {
            updatedAt: manualCreatedAt ?? currentDateTime,
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
    // This find rates that where submitted with this contract at least once.
    // The result could be a child, previous child, or a withdrawn rate .
    // A rate can become a previous child if the contract was withdrawn and the rate is reassigned a new parent contract.
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
        select: {
            // return data only queries data we need.
            id: true,
            revisions: {
                orderBy: {
                    createdAt: 'desc',
                },
                select: {
                    submitInfo: {
                        select: {
                            submittedContracts: {
                                select: {
                                    contractID: true,
                                },
                            },
                        },
                    },
                    unlockInfo: true,
                },
                take: 2, // Only two revision states are possible: mutually unlocked or submitted
            },
            reviewStatusActions: {
                orderBy: {
                    updatedAt: 'desc',
                },
            },
        },
    })

    // filter out submissionPackages to only this latest revision. We only want to compare rates from the lates submission.
    const submissionPackageEntries =
        currentRev.relatedSubmisions[0].submissionPackages.filter(
            (pkg) => pkg.contractRevisionID === currentRev.id
        )

    // Collect child rates to unlock with contract
    for (const childRate of childRates) {
        // We only want to unlock this child rate if the latest rate submission was submitted with this contract. If
        // it wasn't then we know this rate was reassigned or withdrawn from this contract
        const latestSubmittedRev = childRate.revisions.find((r) => r.submitInfo)
        const latestSubmissionParentContract =
            latestSubmittedRev?.submitInfo?.submittedContracts[0]?.contractID

        if (
            submissionPackageEntries.some(
                (p) => p.rateRevision.rateID === childRate.id
            ) &&
            latestSubmissionParentContract === contractID
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
            createdAt: manualCreatedAt ?? currentDateTime,
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
            dsnpContract: currentRev.dsnpContract,
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
                    s3BucketName: d.s3BucketName,
                    s3Key: d.s3Key,
                })),
            },
            supportingDocuments: {
                create: currentRev.supportingDocuments.map((d) => ({
                    position: d.position,
                    name: d.name,
                    s3URL: d.s3URL,
                    sha256: d.sha256,
                    s3BucketName: d.s3BucketName,
                    s3Key: d.s3Key,
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

            //EQRO submission fields only
            eqroNewContractor: currentRev.eqroNewContractor,
            eqroProvisionMcoNewOptionalActivity:
                currentRev.eqroProvisionMcoNewOptionalActivity,
            eqroProvisionNewMcoEqrRelatedActivities:
                currentRev.eqroProvisionNewMcoEqrRelatedActivities,
            eqroProvisionChipEqrRelatedActivities:
                currentRev.eqroProvisionChipEqrRelatedActivities,
            eqroProvisionMcoEqrOrRelatedActivities:
                currentRev.eqroProvisionMcoEqrOrRelatedActivities,
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
    if (!contract.draftRates) {
        return new Error('Unlocked Contract is missing draft rates')
    }

    return {
        ...contract,
        draftRevision: contract.draftRevision,
        draftRates: contract.draftRates,
        status: 'UNLOCKED',
    }
}

type UnlockContractArgsType = {
    contractID: string
    unlockedByUserID: string
    unlockReason: string
    // Used to specify a timestamp when calling multiple prisma functions within the same transaction that need
    // sequential timestamps for revision history
    manualCreatedAt?: Date
}

// Unlock the given contract
// * unlock child rates
// * copy form data
// * set relationships based on last submission
async function unlockContract(
    client: ExtendedPrismaClient,
    args: UnlockContractArgsType
): Promise<UnlockedContractType | NotFoundError | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const result = await unlockContractInsideTransaction(tx, args)
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

export { unlockContract, unlockContractInsideTransaction }
export type { UnlockContractArgsType }
