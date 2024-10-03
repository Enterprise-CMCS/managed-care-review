import type { PrismaClient } from '@prisma/client'
import type { Store } from '../postgres'
import { NewPrismaClient } from '../postgres'

async function configurePrismaClient(): Promise<PrismaClient> {
    const dbURL = process.env.DATABASE_URL

    if (!dbURL) {
        throw new Error(
            'Test Init Error: DATABASE_URL must be set to run tests'
        )
    }

    if (dbURL === 'AWS_SM') {
        throw new Error(
            'Secret Manager not supported for testing against postgres'
        )
    }

    const clientResult = await NewPrismaClient(dbURL)
    if (clientResult instanceof Error) {
        console.info('Error: ', clientResult)
        throw new Error('failed to configure postgres client for testing')
    }

    return clientResult
}

const sharedClientPromise = configurePrismaClient()

async function sharedTestPrismaClient(): Promise<PrismaClient> {
    return await sharedClientPromise
}

function mockStoreThatErrors(): Store {
    const genericError: Error = new Error(
        'UNEXPECTED_EXCEPTION: This error came from the generic store with errors mock'
    )

    return {
        findPrograms: () => {
            return new Error(
                'UNEXPECTED_EXCEPTION: This error came from the generic store with errors mock'
            )
        },
        findStatePrograms: () => {
            return new Error(
                'UNEXPECTED_EXCEPTION: This error came from the generic store with errors mock'
            )
        },
        findAllSupportedStates: async () => {
            return genericError
        },
        findAllUsers: async () => {
            return genericError
        },
        findStateAssignedUsers: async () => {
            return genericError
        },
        findUser: async (_ID) => {
            return genericError
        },
        insertUser: async (_args) => {
            return genericError
        },
        insertManyUsers: async (_args) => {
            return genericError
        },
        updateCmsUserProperties: async (_ID, _State) => {
            return genericError
        },
        insertContractQuestion: async (_ID) => {
            return genericError
        },
        findAllQuestionsByContract: async (_pkgID) => {
            return genericError
        },
        insertContractQuestionResponse: async (_ID) => {
            return genericError
        },
        insertRateQuestion: async (_ID) => {
            return genericError
        },
        findAllQuestionsByRate: async (_pkgID) => {
            return genericError
        },
        insertDraftContract: async (_ID) => {
            return genericError
        },
        findContractWithHistory: async (_ID) => {
            return genericError
        },

        findRateWithHistory: async (_ID) => {
            return genericError
        },
        updateDraftContractWithRates: async (_ID) => {
            return genericError
        },
        updateDraftContractRates: async (_ID) => {
            return genericError
        },
        updateContract: async (_args) => {
            return genericError
        },
        updateDraftContract: async (_args) => {
            return genericError
        },
        updateStateAssignedUsers: async (_args) => {
            return genericError
        },
        findAllContractsWithHistoryByState: async (_ID) => {
            return genericError
        },
        findAllContractsWithHistoryBySubmitInfo: async () => {
            return genericError
        },
        findAllRatesWithHistoryBySubmitInfo: async () => {
            return genericError
        },
        submitContract: async (_ID) => {
            return genericError
        },
        unlockContract: async (_ID) => {
            return genericError
        },
        submitRate: async (_ID) => {
            return genericError
        },
        unlockRate: async (_ID) => {
            return genericError
        },
        replaceRateOnContract: async (_ID) => {
            return genericError
        },
    }
}

export { sharedTestPrismaClient, mockStoreThatErrors }
