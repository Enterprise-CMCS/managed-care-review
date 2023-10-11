import type { PrismaClient } from '@prisma/client'
import type { Store, StoreError } from '../postgres'
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
    const genericStoreError: StoreError = {
        code: 'UNEXPECTED_EXCEPTION',
        message: 'this error came from the generic store with errors mock',
    }

    const genericError: Error = new Error(
        'UNEXPECTED_EXCEPTION: This error came from the generic store with errors mock'
    )

    return {
        findAllHealthPlanPackagesByState: async (_stateCode) => {
            return genericStoreError
        },
        findAllHealthPlanPackagesBySubmittedAt: async () => {
            return genericStoreError
        },
        insertHealthPlanPackage: async (_args) => {
            return genericStoreError
        },
        findHealthPlanPackage: async (_draftUUID) => {
            return genericStoreError
        },
        insertHealthPlanRevision: async (_pkgID, _draft) => {
            return genericStoreError
        },
        updateHealthPlanRevision: async (_pkgID, _formData) => {
            return genericStoreError
        },
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
            return genericStoreError
        },
        findAllRevisions: async () => {
            return genericStoreError
        },
        findAllUsers: async () => {
            return genericStoreError
        },
        findUser: async (_ID) => {
            return genericStoreError
        },
        insertUser: async (_args) => {
            return genericStoreError
        },
        insertManyUsers: async (_args) => {
            return genericStoreError
        },
        updateCmsUserProperties: async (_ID, _State) => {
            return genericStoreError
        },
        insertQuestion: async (_ID) => {
            return genericStoreError
        },
        findAllQuestionsByHealthPlanPackage: async (_pkgID) => {
            return genericStoreError
        },
        insertQuestionResponse: async (_ID) => {
            return genericStoreError
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
        updateContract: async (_args) => {
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
    }
}

export { sharedTestPrismaClient, mockStoreThatErrors }
