import { findContractWithHistory } from './findContractWithHistory'
import { NotFoundError } from '../postgresErrors'
import type { PrismaClient } from '@prisma/client'
import type {
    ContractFormDataType,
    RateFormDataType,
    RateRevisionType,
    ContractType,
} from '../../domain-models/contractAndRates'
import type { StateCodeType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { includeDraftRates } from './prismaDraftContractHelpers'
import { rateRevisionToDomainModel } from './prismaSharedContractRateHelpers'
import type { RateFormEditable } from './updateDraftRate'
import { isEqualData } from '../../resolvers/healthPlanPackage/contractAndRates/resolverHelpers'
import { emptify, nullify } from '../prismaDomainAdaptors'

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
    disconnectRates: {
        rateID: string
        revisionID: string
    }[]
} => {
    const upsertRates = []
    const disconnectRates = []

    // Find rates to create or update
    for (const clientRateData of ratesFromClient) {
        // Find a matching rate revision id in the draftRatesFromDB array.
        const matchingDBRate = ratesFromDB.find(
            (dbRate) => dbRate.formData.rateID === clientRateData.id
        )

        // If there are no matching rates we push into createRates
        if (!matchingDBRate) {
            upsertRates.push({
                id: clientRateData.id,
                ...clientRateData,
            })
            continue
        }

        // If a match is found then we deep compare to figure out if we need to update.
        const isRateDataEqual = isEqualData(
            matchingDBRate.formData,
            clientRateData
        )

        // If rates are not equal we then make the update
        if (!isRateDataEqual) {
            upsertRates.push({
                id: clientRateData.id,
                rateID: matchingDBRate.id,
                ...clientRateData,
            })
        }
    }

    // Find rates to disconnect
    for (const dbRateRev of ratesFromDB) {
        //Find a matching rate revision id in the ratesFromClient
        const matchingHPPRate = ratesFromClient.find(
            (clientRateData) => clientRateData.id === dbRateRev.formData.rateID
        )

        // If convertedRateData does not contain the rate revision id from DB, we push these revisions id and  rate id
        // in disconnectRates
        if (!matchingHPPRate && dbRateRev.formData.rateID) {
            disconnectRates.push({
                rateID: dbRateRev.formData.rateID,
                revisionID: dbRateRev.id,
            })
        }
    }

    return {
        upsertRates,
        disconnectRates,
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
        statutoryRegulatoryAttestation,
        statutoryRegulatoryAttestationDescription,
    } = formData

    try {
        return await client.$transaction(async (tx) => {
            // Given all the Contracts associated with this draft, find the most recent submitted
            const currentContractRev = await tx.contractRevisionTable.findFirst(
                {
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
                }
            )
            if (!currentContractRev) {
                const err = `PRISMA ERROR: Cannot find the current rev to update with contract id: ${contractID}`
                console.error(err)
                return new NotFoundError(err)
            }

            const stateCode = currentContractRev.contract
                .stateCode as StateCodeType
            const ratesFromDB: RateRevisionType[] = []

            // Convert all rates from DB to domain model
            for (const rate of currentContractRev.draftRates) {
                const domainRateRevision = rateRevisionToDomainModel(
                    rate.revisions[0]
                )

                if (domainRateRevision instanceof Error) {
                    return new Error(
                        `Error updating contract with rates: ${domainRateRevision.message}`
                    )
                }

                ratesFromDB.push(domainRateRevision)
            }

            // Parsing rates from request for update or create
            const updateRates =
                rateFormDatas && sortRatesForUpdate(ratesFromDB, rateFormDatas)

            if (updateRates) {
                for (const rateFormData of updateRates.upsertRates) {
                    // Current rate with the latest revision
                    let currentRate = undefined

                    // If no rate id is undefined we know this is a new rate that needs to be inserted into the DB.
                    if (rateFormData.rateID) {
                        currentRate = await tx.rateTable.findUnique({
                            where: {
                                id: rateFormData.id,
                            },
                            include: {
                                // include the single most recent revision that is not submitted
                                revisions: {
                                    where: {
                                        submitInfoID: null,
                                    },
                                    take: 1,
                                    orderBy: {
                                        createdAt: 'desc',
                                    },
                                },
                            },
                        })
                    }

                    const contractsWithSharedRates =
                        rateFormData.packagesWithSharedRateCerts?.map(
                            (pkg) => ({
                                id: pkg.packageId,
                            })
                        ) ?? []

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
                                id: rateFormData.id,
                                stateCode: stateCode,
                                stateNumber: latestStateRateCertNumber,
                                revisions: {
                                    create: {
                                        rateType: rateFormData.rateType,
                                        rateCapitationType:
                                            rateFormData.rateCapitationType,
                                        rateDateStart:
                                            rateFormData.rateDateStart,
                                        rateDateEnd: rateFormData.rateDateEnd,
                                        rateDateCertified:
                                            rateFormData.rateDateCertified,
                                        amendmentEffectiveDateStart:
                                            rateFormData.amendmentEffectiveDateStart,
                                        amendmentEffectiveDateEnd:
                                            rateFormData.amendmentEffectiveDateEnd,
                                        ratePreviouslySubmitted:
                                            rateFormData.ratePreviouslySubmitted,
                                        rateProgramIDs:
                                            rateFormData.rateProgramIDs,
                                        rateCertificationName:
                                            rateFormData.rateCertificationName,
                                        rateDocuments: {
                                            create:
                                                rateFormData.rateDocuments &&
                                                rateFormData.rateDocuments.map(
                                                    (d, idx) => ({
                                                        position: idx,
                                                        ...d,
                                                    })
                                                ),
                                        },
                                        supportingDocuments: {
                                            create:
                                                rateFormData.supportingDocuments &&
                                                rateFormData.supportingDocuments.map(
                                                    (d, idx) => ({
                                                        position: idx,
                                                        ...d,
                                                    })
                                                ),
                                        },
                                        certifyingActuaryContacts: {
                                            create:
                                                rateFormData.certifyingActuaryContacts &&
                                                rateFormData.certifyingActuaryContacts.map(
                                                    (c, idx) => ({
                                                        position: idx,
                                                        ...c,
                                                    })
                                                ),
                                        },
                                        addtlActuaryContacts: {
                                            create:
                                                rateFormData.addtlActuaryContacts &&
                                                rateFormData.addtlActuaryContacts.map(
                                                    (c, idx) => ({
                                                        position: idx,
                                                        ...c,
                                                    })
                                                ),
                                        },
                                        actuaryCommunicationPreference:
                                            rateFormData.actuaryCommunicationPreference,
                                        contractsWithSharedRateRevision: {
                                            connect: contractsWithSharedRates,
                                        },
                                    },
                                },
                                draftContractRevisions: {
                                    connect: {
                                        id: currentContractRev.id,
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
                                                  id: currentRate.revisions[0]
                                                      .id,
                                              },
                                              data: {
                                                  rateType: nullify(
                                                      rateFormData.rateType
                                                  ),
                                                  rateCapitationType: nullify(
                                                      rateFormData.rateCapitationType
                                                  ),
                                                  rateDateStart: nullify(
                                                      rateFormData.rateDateStart
                                                  ),
                                                  rateDateEnd: nullify(
                                                      rateFormData.rateDateEnd
                                                  ),
                                                  ratePreviouslySubmitted:
                                                      nullify(
                                                          rateFormData.ratePreviouslySubmitted
                                                      ),
                                                  rateDateCertified: nullify(
                                                      rateFormData.rateDateCertified
                                                  ),
                                                  amendmentEffectiveDateStart:
                                                      nullify(
                                                          rateFormData.amendmentEffectiveDateStart
                                                      ),
                                                  amendmentEffectiveDateEnd:
                                                      nullify(
                                                          rateFormData.amendmentEffectiveDateEnd
                                                      ),
                                                  rateProgramIDs: emptify(
                                                      rateFormData.rateProgramIDs
                                                  ),
                                                  rateCertificationName:
                                                      nullify(
                                                          rateFormData.rateCertificationName
                                                      ),
                                                  rateDocuments: {
                                                      deleteMany: {},
                                                      create:
                                                          rateFormData.rateDocuments &&
                                                          rateFormData.rateDocuments.map(
                                                              (d, idx) => ({
                                                                  position: idx,
                                                                  ...d,
                                                              })
                                                          ),
                                                  },
                                                  supportingDocuments: {
                                                      deleteMany: {},
                                                      create:
                                                          rateFormData.supportingDocuments &&
                                                          rateFormData.supportingDocuments.map(
                                                              (d, idx) => ({
                                                                  position: idx,
                                                                  ...d,
                                                              })
                                                          ),
                                                  },
                                                  certifyingActuaryContacts: {
                                                      deleteMany: {},
                                                      create:
                                                          rateFormData.certifyingActuaryContacts &&
                                                          rateFormData.certifyingActuaryContacts.map(
                                                              (c, idx) => ({
                                                                  position: idx,
                                                                  ...c,
                                                              })
                                                          ),
                                                  },
                                                  addtlActuaryContacts: {
                                                      deleteMany: {},
                                                      create:
                                                          rateFormData.addtlActuaryContacts &&
                                                          rateFormData.addtlActuaryContacts.map(
                                                              (c, idx) => ({
                                                                  position: idx,
                                                                  ...c,
                                                              })
                                                          ),
                                                  },
                                                  actuaryCommunicationPreference:
                                                      nullify(
                                                          rateFormData.actuaryCommunicationPreference
                                                      ),
                                                  contractsWithSharedRateRevision:
                                                      {
                                                          set: contractsWithSharedRates,
                                                      },
                                              },
                                          },
                                      }
                                    : undefined,
                                draftContractRevisions: {
                                    connect: {
                                        id: currentContractRev.id,
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
                    id: currentContractRev.id,
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
                    statutoryRegulatoryAttestation: nullify(
                        statutoryRegulatoryAttestation
                    ),
                    statutoryRegulatoryAttestationDescription: nullify(
                        statutoryRegulatoryAttestationDescription
                    ),
                    draftRates: {
                        disconnect: updateRates?.disconnectRates
                            ? updateRates.disconnectRates.map((rate) => ({
                                  id: rate.rateID,
                              }))
                            : [],
                    },
                    contract: {
                        update: {
                            draftRateRevisions: {
                                disconnect: updateRates?.disconnectRates
                                    ? updateRates.disconnectRates.map(
                                          (rate) => ({
                                              id: rate.revisionID,
                                          })
                                      )
                                    : [],
                            },
                        },
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
