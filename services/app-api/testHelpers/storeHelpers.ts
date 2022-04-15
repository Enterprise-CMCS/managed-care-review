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
        message: 'this error came from the generic store with errors mock',
    }

    return {
        findAllHealthPlanPackages: async (_stateCode) => {
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
            return undefined
        },
    }
}

export { sharedTestPrismaClient, mockStoreThatErrors }
