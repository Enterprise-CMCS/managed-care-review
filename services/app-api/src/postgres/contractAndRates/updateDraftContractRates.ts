import type { PrismaClient } from '@prisma/client'
import type {
    ContractType,
    RateFormEditableType,
} from '../../domain-models/contractAndRates'
import { NotFoundError } from '../postgresErrors'
import type { PrismaTransactionType } from '../prismaTypes'
import { findContractWithHistory } from './findContractWithHistory'
import {
    prismaRateCreateFormDataFromDomain,
    prismaUpdateRateFormDataFromDomain,
} from './prismaContractRateAdaptors'

interface UpdatedRatesType {
    create: {
        formData: RateFormEditableType
        ratePosition: number
    }[]
    update: {
        rateID: string
        formData: RateFormEditableType
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

async function updateDraftContractRatesInsideTransaction(
    tx: PrismaTransactionType,
    args: UpdateDraftContractRatesArgsType
): Promise<ContractType | Error> {
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
            'PROGRAMER ERROR: No state found with code: ' + contract.stateCode
        )
    }

    let nextRateNumber = state.latestStateRateCertNumber + 1

    // create new rates with new revisions
    const createdRateJoins: { rateID: string; ratePosition: number }[] = []
    for (const createRateArg of args.rateUpdates.create) {
        const rateFormData = createRateArg.formData
        const thisRateNumber = nextRateNumber
        nextRateNumber++

        const rateToCreate = {
            stateCode: contract.stateCode,
            stateNumber: thisRateNumber,
            revisions: {
                create: prismaRateCreateFormDataFromDomain(rateFormData),
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
    await tx.rateTable.deleteMany({
        where: {
            id: {
                in: args.rateUpdates.delete.map((ru) => ru.rateID),
            },
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
                'attempting to update a rate that is not editable: ' + ru.rateID
            )
        }

        await tx.rateRevisionTable.update({
            where: { id: draftRev.id },
            data: prismaUpdateRateFormDataFromDomain(ru.formData),
        })
    }

    // unlink old data from disconnected rates
    // This does nothing, just checks that the rates all exist. We are removing based on LINK being populated...
    for (const ru of args.rateUpdates.unlink) {
        const draftRev = await tx.rateRevisionTable.findFirst({
            where: {
                rateID: ru.rateID,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        if (!draftRev) {
            return new Error(
                'attempting to unlink a rate with no revision: ' + ru.rateID
            )
        }
    }

    return findContractWithHistory(tx, args.contractID)
}

async function updateDraftContractRates(
    client: PrismaClient,
    args: UpdateDraftContractRatesArgsType
): Promise<ContractType | Error> {
    try {
        return await client.$transaction(async (tx) => {
            const result = await updateDraftContractRatesInsideTransaction(
                tx,
                args
            )

            return result
        })
    } catch (err) {
        console.error('PRISMA ERR', err)
        return err
    }
}

export type { UpdateDraftContractRatesArgsType }

export { updateDraftContractRates, updateDraftContractRatesInsideTransaction }
