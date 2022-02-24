import { PrismaClient } from '@prisma/client'
import { NewPrismaClient, Store, StoreError } from '../postgres'

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
        console.log('Error: ', clientResult)
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
        message: 'this error came from the generic store with errors mock'
    }

    return {
        findAllSubmissions: async (stateCode) => {
            return genericStoreError
        },
        insertDraftSubmission: async (args) => {
            return genericStoreError
        },
        findDraftSubmission: async (draftUUID) => {
            return genericStoreError
        },
        findSubmissionWithRevisions: async (draftUUID) => {
            return genericStoreError
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        findDraftSubmissionByStateNumber: async (_stateCode, _stateNumber) => {
            throw new Error('UNIMPLEMENTED')
        },
        updateDraftSubmission: async (draftSubmission) => {
            return genericStoreError
        },
        updateStateSubmission: async (submission) => {
            return genericStoreError
        },
        findStateSubmission: async (submissionID) => {
            return genericStoreError
        },
        insertNewRevision: async (submissionID, draft) => {
            return genericStoreError
        },
        findPrograms: () => {
            return undefined
        },
    }
}

export { sharedTestPrismaClient, mockStoreThatErrors }
