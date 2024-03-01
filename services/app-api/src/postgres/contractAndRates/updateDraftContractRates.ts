import type { ContractType } from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'
import { emptify, nullify } from '../prismaDomainAdaptors'
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
    delete: {
        rateID: string
    }[]
}

interface UpdateDraftContractRatesArgsType {
    contractID: string
    rateUpdates: UpdatedRatesType
}

function prismaRateCreateFormDataFromDomain(rateFormData: RateFormEditable) {
    return {
        rateType: rateFormData.rateType,
        rateCapitationType: rateFormData.rateCapitationType,
        rateDateStart: rateFormData.rateDateStart,
        rateDateEnd: rateFormData.rateDateEnd,
        rateDateCertified: rateFormData.rateDateCertified,
        amendmentEffectiveDateStart: rateFormData.amendmentEffectiveDateStart,
        amendmentEffectiveDateEnd: rateFormData.amendmentEffectiveDateEnd,
        rateProgramIDs: rateFormData.rateProgramIDs,
        rateCertificationName: rateFormData.rateCertificationName,
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
                rateFormData.supportingDocuments.map((d, idx) => ({
                    position: idx,
                    ...d,
                })),
        },
        certifyingActuaryContacts: {
            create:
                rateFormData.certifyingActuaryContacts &&
                rateFormData.certifyingActuaryContacts.map((c, idx) => ({
                    position: idx,
                    ...c,
                })),
        },
        addtlActuaryContacts: {
            create:
                rateFormData.addtlActuaryContacts &&
                rateFormData.addtlActuaryContacts.map((c, idx) => ({
                    position: idx,
                    ...c,
                })),
        },
        actuaryCommunicationPreference:
            rateFormData.actuaryCommunicationPreference,
    }
}

function prismaUpdateRateFormDataFromDomain(rateFormData: RateFormEditable) {
    return {
        rateType: nullify(rateFormData.rateType),
        rateCapitationType: nullify(rateFormData.rateCapitationType),
        rateDateStart: nullify(rateFormData.rateDateStart),
        rateDateEnd: nullify(rateFormData.rateDateEnd),
        rateDateCertified: nullify(rateFormData.rateDateCertified),
        amendmentEffectiveDateStart: nullify(
            rateFormData.amendmentEffectiveDateStart
        ),
        amendmentEffectiveDateEnd: nullify(
            rateFormData.amendmentEffectiveDateEnd
        ),
        rateProgramIDs: emptify(rateFormData.rateProgramIDs),
        rateCertificationName: nullify(rateFormData.rateCertificationName),
        rateDocuments: {
            deleteMany: {},
            create:
                rateFormData.rateDocuments &&
                rateFormData.rateDocuments.map((d, idx) => ({
                    position: idx,
                    ...d,
                })),
        },
        supportingDocuments: {
            deleteMany: {},
            create:
                rateFormData.supportingDocuments &&
                rateFormData.supportingDocuments.map((d, idx) => ({
                    position: idx,
                    ...d,
                })),
        },
        certifyingActuaryContacts: {
            deleteMany: {},
            create:
                rateFormData.certifyingActuaryContacts &&
                rateFormData.certifyingActuaryContacts.map((c, idx) => ({
                    position: idx,
                    ...c,
                })),
        },
        addtlActuaryContacts: {
            deleteMany: {},
            create:
                rateFormData.addtlActuaryContacts &&
                rateFormData.addtlActuaryContacts.map((c, idx) => ({
                    position: idx,
                    ...c,
                })),
        },
        actuaryCommunicationPreference:
            rateFormData.actuaryCommunicationPreference,
    }
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
            const rateFormDataem = ru.formData
            const thisRateNumber = nextRateNumber
            nextRateNumber++
            return {
                stateCode: contract.stateCode,
                stateNumber: thisRateNumber,
                revisions: {
                    create: prismaRateCreateFormDataFromDomain(rateFormDataem),
                },
            }
        })

        // to delete draft rates, we need to delete their revisions first
        await client.rateRevisionTable.deleteMany({
            where: {
                rateID: {
                    in: args.rateUpdates.delete.map((ru) => ru.rateID),
                },
            },
        })

        // create new rates and link and unlink others
        await client.contractRevisionTable.update({
            where: { id: draftRevision.id },
            data: {
                draftRates: {
                    create: ratesToCreate,
                    connect: args.rateUpdates.link.map((ru) => ({
                        id: ru.rateID,
                    })),
                    disconnect: args.rateUpdates.unlink.map((ru) => ({
                        id: ru.rateID,
                    })),
                    delete: args.rateUpdates.delete.map((ru) => ({
                        id: ru.rateID,
                    })),
                },
            },
            include: {
                draftRates: true,
            },
        })

        // update existing rates
        for (const ru of args.rateUpdates.update) {
            const draftRev = await client.rateRevisionTable.findFirst({
                where: {
                    rateID: ru.rateID,
                    submitInfoID: null,
                },
            })

            if (!draftRev) {
                return new Error(
                    'attempting to update a rate that is not editable: ' +
                        ru.rateID
                )
            }

            await client.rateRevisionTable.update({
                where: { id: draftRev.id },
                data: prismaUpdateRateFormDataFromDomain(ru.formData),
            })
        }

        return findContractWithHistory(client, args.contractID)
    } catch (err) {
        console.error('PRISMA ERR', err)
        return err
    }
}

export type { UpdateDraftContractRatesArgsType }

export { updateDraftContractRates }
