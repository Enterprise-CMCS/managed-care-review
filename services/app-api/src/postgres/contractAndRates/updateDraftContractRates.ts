import type { PrismaClient } from '@prisma/client'
import type { ContractType } from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'
import { emptify, nullify } from '../prismaDomainAdaptors'
import { findContractWithHistory } from './findContractWithHistory'
import type { RateFormEditable } from './updateDraftRate'

interface UpdatedRatesType {
    create: {
        formData: RateFormEditable
        ratePosition: number
    }[]
    update: {
        rateID: string
        formData: RateFormEditable
        ratePosition: number
    }[]
    link: {
        rateID: string
        ratePosition: number
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
    client: PrismaClient,
    args: UpdateDraftContractRatesArgsType
): Promise<ContractType | Error> {
    try {
        return await client.$transaction(async (tx) => {
            // for now, get the latest contract revision, eventually we'll have rate revisions directly on this
            const contract = await tx.contractTable.findUnique({
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
            const state = await tx.state.findUnique({
                where: { stateCode: contract.stateCode },
            })

            if (!state) {
                return new Error(
                    'PROGRAMER ERROR: No state found with code: ' +
                        contract.stateCode
                )
            }

            let nextRateNumber = state.latestStateRateCertNumber + 1

            // create new rates with new revisions
            const createdRateJoins: { rateID: string; ratePosition: number }[] =
                []
            for (const createRateArg of args.rateUpdates.create) {
                const rateFormData = createRateArg.formData
                const thisRateNumber = nextRateNumber
                nextRateNumber++

                const rateToCreate = {
                    stateCode: contract.stateCode,
                    stateNumber: thisRateNumber,
                    revisions: {
                        create: prismaRateCreateFormDataFromDomain(
                            rateFormData
                        ),
                    },
                }

                const createdRate = await tx.rateTable.create({
                    data: rateToCreate,
                    include: {
                        revisions: true,
                    },
                })

                createdRateJoins.push({
                    rateID: createdRate.id,
                    ratePosition: createRateArg.ratePosition,
                })
            }

            // to delete draft rates, we need to delete their revisions first
            await tx.rateRevisionTable.deleteMany({
                where: {
                    rateID: {
                        in: args.rateUpdates.delete.map((ru) => ru.rateID),
                    },
                },
            })

            const oldLinksToCreate = [
                ...createdRateJoins.map((lr) => lr.rateID),
                ...args.rateUpdates.link.map((ru) => ru.rateID),
            ]

            // create new rates and link and unlink others
            await tx.contractRevisionTable.update({
                where: { id: draftRevision.id },
                data: {
                    draftRates: {
                        // create: ratesToCreate,
                        connect: oldLinksToCreate.map((rID) => ({
                            id: rID,
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

            // new rate + contract Linking tables

            // for each of the links, we have to get the order right
            // all the newly valid links are from create/update/link
            const links: { rateID: string; ratePosition: number }[] = [
                ...createdRateJoins.map((rj) => ({
                    rateID: rj.rateID,
                    ratePosition: rj.ratePosition,
                })),
                ...args.rateUpdates.update.map((ru) => ({
                    rateID: ru.rateID,
                    ratePosition: ru.ratePosition,
                })),
                ...args.rateUpdates.link.map((ru) => ({
                    rateID: ru.rateID,
                    ratePosition: ru.ratePosition,
                })),
            ]

            // Check our work, these should be an incrementing list of ratePositions.
            const ratePositions = links.map((l) => l.ratePosition).sort()
            let lastPosition = 0
            for (const ratePosition of ratePositions) {
                if (ratePosition !== lastPosition + 1) {
                    console.error(
                        'Updated Rate ratePositions Are Not Ordered',
                        ratePositions
                    )
                    return new Error(
                        'updateDraftContractRates called with discontinuous order ratePositions'
                    )
                }
                lastPosition++
            }

            await tx.contractTable.update({
                where: { id: args.contractID },
                data: {
                    draftRates: {
                        deleteMany: {},
                        create: links,
                    },
                },
            })

            // end new R+C Contract Linking Tables

            // update existing rates
            for (const ru of args.rateUpdates.update) {
                const draftRev = await tx.rateRevisionTable.findFirst({
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

                await tx.rateRevisionTable.update({
                    where: { id: draftRev.id },
                    data: prismaUpdateRateFormDataFromDomain(ru.formData),
                })
            }

            return findContractWithHistory(tx, args.contractID)
        })
    } catch (err) {
        console.error('PRISMA ERR', err)
        return err
    }
}

export type { UpdateDraftContractRatesArgsType }

export { updateDraftContractRates }
