import type { ContractType } from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'
import type { PrismaTransactionType } from '../prismaTypes'
import { findContractWithHistory } from './findContractWithHistory'
import type { RateFormEditable } from './updateDraftRate'

interface UpdatedRatesType {
    create: {
        formData: RateFormEditable
    }[]
    update: {
        rateID: string
        formData: RateFormEditable
    }[]
    link: {
        rateID: string
    }[]
    unlink: {
        rateID: string
    }[]
}

interface UpdateDraftContractRatesArgsType {
    contractID: string
    rateUpdates: UpdatedRatesType
}

async function updateDraftContractRates(
    client: PrismaTransactionType,
    args: UpdateDraftContractRatesArgsType
): Promise<ContractType | Error> {
    try {
        // for now, get the latest contract revision, eventually we'll have rate revisions directly on this
        const contract = await client.contractTable.findUnique({
            where: {
                id: args.contractID,
            },
            include: {
                revisions: {
                    take: 1,
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        })

        if (!contract) {
            return new NotFoundError(
                'contract not found with ID: ' + args.contractID
            )
        }

        const draftRevision = contract.revisions[0]
        if (!draftRevision) {
            return new Error(
                'PROGRAMMER ERROR: This draft contract has no draft revision'
            )
        }

        // figure out the rate number range for created rates.
        const state = await client.state.findUnique({
            where: { stateCode: contract.stateCode },
        })

        if (!state) {
            return new Error(
                'PROGRAMER ERROR: No state found with code: ' +
                    contract.stateCode
            )
        }

        let nextRateNumber = state.latestStateRateCertNumber

        // create new rates with new revisions
        const ratesToCreate = args.rateUpdates.create.map((ru) => {
            const rateFormData = ru.formData
            const thisRateNumber = nextRateNumber
            nextRateNumber++
            return {
                stateCode: contract.stateCode,
                stateNumber: thisRateNumber,
                revisions: {
                    create: {
                        rateType: rateFormData.rateType,
                        rateCapitationType: rateFormData.rateCapitationType,
                        rateDateStart: rateFormData.rateDateStart,
                        rateDateEnd: rateFormData.rateDateEnd,
                        rateDateCertified: rateFormData.rateDateCertified,
                        amendmentEffectiveDateStart:
                            rateFormData.amendmentEffectiveDateStart,
                        amendmentEffectiveDateEnd:
                            rateFormData.amendmentEffectiveDateEnd,
                        rateProgramIDs: rateFormData.rateProgramIDs,
                        rateCertificationName:
                            rateFormData.rateCertificationName,
                        rateDocuments: {
                            create:
                                rateFormData.rateDocuments &&
                                rateFormData.rateDocuments.map((d, idx) => ({
                                    position: idx,
                                    ...d,
                                })),
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
                    },
                },
            }
        })

        await client.contractRevisionTable.update({
            where: { id: draftRevision.id },
            data: {
                draftRates: {
                    create: ratesToCreate,
                },
            },
            include: {
                draftRates: true,
            },
        })

        return findContractWithHistory(client, args.contractID)
    } catch (err) {
        return err
    }
}

export type { UpdateDraftContractRatesArgsType }

export { updateDraftContractRates }
