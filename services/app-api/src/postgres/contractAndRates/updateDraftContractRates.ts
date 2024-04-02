import type { PrismaClient } from '@prisma/client'
import type {
    ContractType,
    RateFormEditableType,
} from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'
import { findContractWithHistory } from './findContractWithHistory'
import {
    prismaRateCreateFormDataFromDomain,
    prismaUpdateRateFormDataFromDomain,
} from './prismaContractRateAdaptors'

interface UpdatedRatesType {
    create: {
        formData: RateFormEditableType
    }[]
    update: {
        rateID: string
        formData: RateFormEditableType
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
            const ratesToCreate = args.rateUpdates.create.map((ru) => {
                const rateFormData = ru.formData
                const thisRateNumber = nextRateNumber
                nextRateNumber++
                return {
                    stateCode: contract.stateCode,
                    stateNumber: thisRateNumber,
                    revisions: {
                        create: prismaRateCreateFormDataFromDomain(
                            rateFormData
                        ),
                    },
                }
            })

            // to delete draft rates, we need to delete their revisions first
            await tx.rateRevisionTable.deleteMany({
                where: {
                    rateID: {
                        in: args.rateUpdates.delete.map((ru) => ru.rateID),
                    },
                },
            })

            // create new rates and link and unlink others
            await tx.contractRevisionTable.update({
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
