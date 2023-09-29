import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../storeError'
import type { PrismaClient } from '@prisma/client'
import type {
    ContractFormDataType,
    RateFormDataType,
    RateRevisionType,
    ContractType,
} from '../../domain-models/contractAndRates'
import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'
import { includeDraftRates } from './prismaDraftContractHelpers'
import { rateRevisionToDomainModel } from './prismaSharedContractRateHelpers'
import type { RateFormEditable } from './updateDraftRate'
import { isEqualData } from '../../resolvers/healthPlanPackage/contractAndRates/resolverHelpers'

// since prisma needs nulls to indicate "remove this field" instead of "ignore this field"
// this function translates undefineds into nulls
function nullify<T>(field: T | undefined): T | null {
    if (field === undefined) {
        return null
    }

    return field
}

// since prisma needs nulls to indicate "remove this field" instead of "ignore this field"
// this function translates undefineds into empty arrays
function emptify<T>(field: T[] | undefined): T[] {
    if (field === undefined) {
        return []
    }
    return field
}

type ContractFormEditable = Partial<ContractFormDataType>

type UpdateContractArgsType = {
    contractID: string
    formData: ContractFormEditable
    rateFormDatas?: RateFormEditable[]
}

const sortRatesForUpdate = (
    ratesFromDB: RateRevisionType[],
    ratesFromClient: RateFormDataType[]
): {
    upsertRates: RateFormEditable[]
    disconnectRateIDs: string[]
} => {
    const upsertRates = []
    const disconnectRateIDs = []

    // Find rates to create or update
    for (const rateData of ratesFromClient) {
        // Find a matching rate revision id in the draftRatesFromDB array.
        const matchingDBRate = ratesFromDB.find(
            (dbRate) => dbRate.id === rateData.id
        )

        // If there are no matching rates we push into createRates
        if (!matchingDBRate) {
            upsertRates.push({
                id: rateData.id,
                ...rateData,
            })
            continue
        }

        // If a match is found then we deep compare to figure out if we need to update.
        const isRateDataEqual = isEqualData(matchingDBRate.formData, rateData)

        // If rates are not equal we then make the update
        if (!isRateDataEqual) {
            upsertRates.push({
                id: rateData.id,
                rateID: matchingDBRate.id,
                ...rateData,
            })
        }
    }

    // Find rates to disconnect
    for (const dbRate of ratesFromDB) {
        //Find a matching rate revision id in the ratesFromClient
        const matchingHPPRate = ratesFromClient.find(
            (convertedRate) => convertedRate.id === dbRate.id
        )

        // If convertedRateData does not contain the rate revision id from DB, we push these revisions rateID in disconnectRateIDs
        if (!matchingHPPRate && dbRate.formData.rateID) {
            disconnectRateIDs.push(dbRate.formData.rateID)
        }
    }

    return {
        upsertRates,
        disconnectRateIDs,
    }
}

// Update the given draft
// * can change the set of draftRates
// * set the formData
async function updateDraftContractWithRates(
    client: PrismaClient,
    args: UpdateContractArgsType
): Promise<ContractType | NotFoundError | Error> {
    const { contractID, formData, rateFormDatas } = args
    const {
        submissionType,
        submissionDescription,
        programIDs,
        populationCovered,
        riskBasedContract,
        stateContacts,
        supportingDocuments,
        contractType,
        contractExecutionStatus,
        contractDocuments,
        contractDateStart,
        contractDateEnd,
        managedCareEntities,
        federalAuthorities,
        modifiedBenefitsProvided,
        modifiedGeoAreaServed,
        modifiedMedicaidBeneficiaries,
        modifiedRiskSharingStrategy,
        modifiedIncentiveArrangements,
        modifiedWitholdAgreements,
        modifiedStateDirectedPayments,
        modifiedPassThroughPayments,
        modifiedPaymentsForMentalDiseaseInstitutions,
        modifiedMedicalLossRatioStandards,
        modifiedOtherFinancialPaymentIncentive,
        modifiedEnrollmentProcess,
        modifiedGrevienceAndAppeal,
        modifiedNetworkAdequacyStandards,
        modifiedLengthOfContract,
        modifiedNonRiskPaymentArrangements,
        inLieuServicesAndSettings,
    } = formData

    try {
        return await client.$transaction(async (tx) => {
            // Given all the Contracts associated with this draft, find the most recent submitted
            const currentRev = await tx.contractRevisionTable.findFirst({
                where: {
                    contractID: contractID,
                    submitInfoID: null,
                },
                include: {
                    contract: true,
                    draftRates: {
                        include: includeDraftRates,
                    },
                },
            })
            if (!currentRev) {
                const err = `PRISMA ERROR: Cannot find the current rev to update with contract id: ${contractID}`
                console.error(err)
                return new NotFoundError(err)
            }

            const stateCode = currentRev.contract.stateCode as StateCodeType
            const ratesFromDB = currentRev.draftRates.map((rate) =>
                rateRevisionToDomainModel(rate.revisions[0])
            )
            const updateRates =
                rateFormDatas && sortRatesForUpdate(ratesFromDB, rateFormDatas)

            if (updateRates) {
                for (const rateRevision of updateRates.upsertRates) {
                    // Check if the rate exists
                    // - We don't know if the rate revision exists in the DB we just know it's not connected to the contract.
                    // - toProtoBuffer gives every rate revision a UUID if there isn't one, so we cannot rely on revision id.
                    // - We can use this revision id to check if a rate and revision exists.

                    // Find the rate of the revision with only one draft revision
                    const currentRate = rateRevision.id
                        ? await tx.rateTable.findFirst({
                              where: {
                                  revisions: {
                                      some: {
                                          id: rateRevision.id,
                                      },
                                  },
                              },
                              include: {
                                  // include the single most recent revision that is not submitted
                                  revisions: {
                                      where: {
                                          submitInfoID: null,
                                      },
                                      take: 1,
                                  },
                              },
                          })
                        : undefined

                    // If rate does not exist, we need to create a new rate.
                    if (!currentRate) {
                        const { latestStateRateCertNumber } =
                            await tx.state.update({
                                data: {
                                    latestStateRateCertNumber: {
                                        increment: 1,
                                    },
                                },
                                where: {
                                    stateCode: stateCode,
                                },
                            })

                        await tx.rateTable.create({
                            data: {
                                stateCode: stateCode,
                                stateNumber: latestStateRateCertNumber,
                                revisions: {
                                    create: {
                                        rateType: rateRevision.rateType,
                                        rateCapitationType:
                                            rateRevision.rateCapitationType,
                                        rateDateStart:
                                            rateRevision.rateDateStart,
                                        rateDateEnd: rateRevision.rateDateEnd,
                                        rateDateCertified:
                                            rateRevision.rateDateCertified,
                                        amendmentEffectiveDateStart:
                                            rateRevision.amendmentEffectiveDateStart,
                                        amendmentEffectiveDateEnd:
                                            rateRevision.amendmentEffectiveDateEnd,
                                        rateProgramIDs:
                                            rateRevision.rateProgramIDs,
                                        rateCertificationName:
                                            rateRevision.rateCertificationName,
                                        rateDocuments: {
                                            create:
                                                rateRevision.rateDocuments &&
                                                rateRevision.rateDocuments.map(
                                                    (d, idx) => ({
                                                        position: idx,
                                                        ...d,
                                                    })
                                                ),
                                        },
                                        supportingDocuments: {
                                            create:
                                                rateRevision.supportingDocuments &&
                                                rateRevision.supportingDocuments.map(
                                                    (d, idx) => ({
                                                        position: idx,
                                                        ...d,
                                                    })
                                                ),
                                        },
                                        certifyingActuaryContacts: {
                                            create:
                                                rateRevision.certifyingActuaryContacts &&
                                                rateRevision.certifyingActuaryContacts.map(
                                                    (c, idx) => ({
                                                        position: idx,
                                                        ...c,
                                                    })
                                                ),
                                        },
                                        addtlActuaryContacts: {
                                            create:
                                                rateRevision.addtlActuaryContacts &&
                                                rateRevision.addtlActuaryContacts.map(
                                                    (c, idx) => ({
                                                        position: idx,
                                                        ...c,
                                                    })
                                                ),
                                        },
                                        actuaryCommunicationPreference:
                                            rateRevision.actuaryCommunicationPreference,
                                    },
                                },
                                draftContractRevisions: {
                                    connect: {
                                        id: currentRev.id,
                                    },
                                },
                            },
                        })
                    } else {
                        // If the current rate has no draft revisions, based form our find with revision with no submitInfoID
                        // then this is a submitted rate
                        const isSubmitted = currentRate.revisions.length === 0

                        await tx.rateTable.update({
                            where: {
                                id: currentRate.id,
                            },
                            data: {
                                // if rate is not submitted, we update the revision data, otherwise we only make the
                                //  connection to the draft contract revision.
                                revisions: !isSubmitted
                                    ? {
                                          update: {
                                              where: {
                                                  id: rateRevision.id,
                                              },
                                              data: {
                                                  rateType: nullify(
                                                      rateRevision.rateType
                                                  ),
                                                  rateCapitationType: nullify(
                                                      rateRevision.rateCapitationType
                                                  ),
                                                  rateDateStart: nullify(
                                                      rateRevision.rateDateStart
                                                  ),
                                                  rateDateEnd: nullify(
                                                      rateRevision.rateDateEnd
                                                  ),
                                                  rateDateCertified: nullify(
                                                      rateRevision.rateDateCertified
                                                  ),
                                                  amendmentEffectiveDateStart:
                                                      nullify(
                                                          rateRevision.amendmentEffectiveDateStart
                                                      ),
                                                  amendmentEffectiveDateEnd:
                                                      nullify(
                                                          rateRevision.amendmentEffectiveDateEnd
                                                      ),
                                                  rateProgramIDs: emptify(
                                                      rateRevision.rateProgramIDs
                                                  ),
                                                  rateCertificationName:
                                                      nullify(
                                                          rateRevision.rateCertificationName
                                                      ),
                                                  rateDocuments: {
                                                      deleteMany: {},
                                                      create:
                                                          rateRevision.rateDocuments &&
                                                          rateRevision.rateDocuments.map(
                                                              (d, idx) => ({
                                                                  position: idx,
                                                                  ...d,
                                                              })
                                                          ),
                                                  },
                                                  supportingDocuments: {
                                                      deleteMany: {},
                                                      create:
                                                          rateRevision.supportingDocuments &&
                                                          rateRevision.supportingDocuments.map(
                                                              (d, idx) => ({
                                                                  position: idx,
                                                                  ...d,
                                                              })
                                                          ),
                                                  },
                                                  certifyingActuaryContacts: {
                                                      deleteMany: {},
                                                      create:
                                                          rateRevision.certifyingActuaryContacts &&
                                                          rateRevision.certifyingActuaryContacts.map(
                                                              (c, idx) => ({
                                                                  position: idx,
                                                                  ...c,
                                                              })
                                                          ),
                                                  },
                                                  addtlActuaryContacts: {
                                                      deleteMany: {},
                                                      create:
                                                          rateRevision.addtlActuaryContacts &&
                                                          rateRevision.addtlActuaryContacts.map(
                                                              (c, idx) => ({
                                                                  position: idx,
                                                                  ...c,
                                                              })
                                                          ),
                                                  },
                                                  actuaryCommunicationPreference:
                                                      nullify(
                                                          rateRevision.actuaryCommunicationPreference
                                                      ),
                                              },
                                          },
                                      }
                                    : undefined,
                                draftContractRevisions: {
                                    connect: {
                                        id: currentRev.id,
                                    },
                                },
                            },
                        })
                    }
                }
            }

            // Then update resource, adjusting all simple fields and creating new linked resources for fields holding relationships to other day,
            await tx.contractRevisionTable.update({
                where: {
                    id: currentRev.id,
                },
                data: {
                    populationCovered: nullify(populationCovered),
                    programIDs: emptify(programIDs),
                    riskBasedContract: nullify(riskBasedContract),
                    submissionType: submissionType,
                    submissionDescription: submissionDescription,
                    contractType: contractType,
                    contractExecutionStatus: nullify(contractExecutionStatus),
                    contractDocuments: {
                        deleteMany: {},
                        create:
                            contractDocuments &&
                            contractDocuments.map((d, idx) => ({
                                position: idx,
                                ...d,
                            })),
                    },
                    supportingDocuments: {
                        deleteMany: {},
                        create:
                            supportingDocuments &&
                            supportingDocuments.map((d, idx) => ({
                                position: idx,
                                ...d,
                            })),
                    },
                    stateContacts: {
                        deleteMany: {},
                        create:
                            stateContacts &&
                            stateContacts.map((c, idx) => ({
                                position: idx,
                                ...c,
                            })),
                    },
                    contractDateStart: nullify(contractDateStart),
                    contractDateEnd: nullify(contractDateEnd),
                    managedCareEntities: emptify(managedCareEntities),
                    federalAuthorities: emptify(federalAuthorities),
                    inLieuServicesAndSettings: nullify(
                        inLieuServicesAndSettings
                    ),
                    modifiedBenefitsProvided: nullify(modifiedBenefitsProvided),
                    modifiedGeoAreaServed: nullify(modifiedGeoAreaServed),
                    modifiedMedicaidBeneficiaries: nullify(
                        modifiedMedicaidBeneficiaries
                    ),
                    modifiedRiskSharingStrategy: nullify(
                        modifiedRiskSharingStrategy
                    ),
                    modifiedIncentiveArrangements: nullify(
                        modifiedIncentiveArrangements
                    ),
                    modifiedWitholdAgreements: nullify(
                        modifiedWitholdAgreements
                    ),
                    modifiedStateDirectedPayments: nullify(
                        modifiedStateDirectedPayments
                    ),
                    modifiedPassThroughPayments: nullify(
                        modifiedPassThroughPayments
                    ),
                    modifiedPaymentsForMentalDiseaseInstitutions: nullify(
                        modifiedPaymentsForMentalDiseaseInstitutions
                    ),
                    modifiedMedicalLossRatioStandards: nullify(
                        modifiedMedicalLossRatioStandards
                    ),
                    modifiedOtherFinancialPaymentIncentive: nullify(
                        modifiedOtherFinancialPaymentIncentive
                    ),
                    modifiedEnrollmentProcess: nullify(
                        modifiedEnrollmentProcess
                    ),
                    modifiedGrevienceAndAppeal: nullify(
                        modifiedGrevienceAndAppeal
                    ),
                    modifiedNetworkAdequacyStandards: nullify(
                        modifiedNetworkAdequacyStandards
                    ),
                    modifiedLengthOfContract: nullify(modifiedLengthOfContract),
                    modifiedNonRiskPaymentArrangements: nullify(
                        modifiedNonRiskPaymentArrangements
                    ),
                    draftRates: {
                        disconnect: updateRates?.disconnectRateIDs
                            ? updateRates.disconnectRateIDs.map((rateID) => ({
                                  id: rateID,
                              }))
                            : [],
                    },
                },
            })

            return findContractWithHistory(tx, contractID)
        })
    } catch (err) {
        console.error('Prisma error updating contract', err)
        return err
    }
}

export { updateDraftContractWithRates }
export type { UpdateContractArgsType, ContractFormEditable }
