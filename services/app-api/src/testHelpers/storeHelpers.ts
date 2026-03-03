import { NewPrismaClient, type Store } from '../postgres'
import type { ExtendedPrismaClient } from '../postgres/prismaClient'

async function configurePrismaClient(): Promise<ExtendedPrismaClient> {
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

    return clientResult as unknown as ExtendedPrismaClient
}

const sharedClientPromise = configurePrismaClient()

async function sharedTestPrismaClient(): Promise<ExtendedPrismaClient> {
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
        insertRateQuestionResponse: async (_ID) => {
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
        findRateRelatedContracts: async (_ID) => {
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
        findAllRatesStripped: async () => {
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
        findAllDocuments: async () => {
            return genericError
        },
        findContractRevision: async (_ID) => {
            return genericError
        },
        findRateRevision: async (_ID) => {
            return genericError
        },
        approveContract: async (_ID) => {
            return genericError
        },
        withdrawContract: async (_ID) => {
            return genericError
        },
        undoWithdrawContract: async (_ID) => {
            return genericError
        },
        withdrawRate: async (_ID) => {
            return genericError
        },
        undoWithdrawRate: async (_ID) => {
            return genericError
        },
        overrideRateData: async (_args) => {
            return genericError
        },
        findEmailSettings: async () => {
            return genericError
        },
        updateEmailSettings: async (_args) => {
            return genericError
        },
        createOAuthClient: async (_args) => {
            return genericError
        },
        listOAuthClients: async () => {
            return genericError
        },
        getOAuthClientById: async (_ID) => {
            return genericError
        },
        getOAuthClientByClientId: async (_clientId) => {
            return genericError
        },
        deleteOAuthClient: async (_clientId) => {
            return genericError
        },
        updateOAuthClient: async (_clientId, _data) => {
            return genericError
        },
        getOAuthClientsByUserId: async (_userID) => {
            return genericError
        },
        findDocumentById: async (_userID) => {
            return genericError
        },
        createDocumentZipPackage: async (_userID) => {
            return genericError
        },
        findDocumentZipPackagesByContractRevision: async (_userID) => {
            return genericError
        },
        findDocumentZipPackagesByRateRevision: async (_userID) => {
            return genericError
        },
    }
}

export { sharedTestPrismaClient, mockStoreThatErrors }
