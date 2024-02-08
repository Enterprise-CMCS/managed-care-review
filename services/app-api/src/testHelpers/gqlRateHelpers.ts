import SUBMIT_RATE from 'app-graphql/src/mutations/submitRate.graphql'
import FETCH_RATE from 'app-graphql/src/queries/fetchRate.graphql'
import UNLOCK_RATE from 'app-graphql/src/mutations/unlockRate.graphql'
import { findStatePrograms } from '../postgres'
import { must } from './assertionHelpers'
import { defaultFloridaRateProgram } from './gqlHelpers'
import { mockDraftRate, mockInsertRateArgs } from './rateDataMocks'
import { sharedTestPrismaClient } from './storeHelpers'
import { insertDraftRate } from '../postgres/contractAndRates/insertRate'
import { updateDraftRate } from '../postgres/contractAndRates/updateDraftRate'

import type { RateType, RateRevisionType } from '../domain-models'
import type { InsertRateArgsType } from '../postgres/contractAndRates/insertRate'
import type { RateFormEditable } from '../postgres/contractAndRates/updateDraftRate'
import type { ApolloServer } from 'apollo-server-lambda'

const fetchTestRateById = async (
    server: ApolloServer,
    rateID: string
): Promise<RateType> => {
    const input = { rateID }
    const result = await server.executeOperation({
        query: FETCH_RATE,
        variables: { input },
    })

    if (result.errors)
        throw new Error(
            `fetchTestRateById query failed with errors ${result.errors}`
        )

    if (!result.data) {
        throw new Error('fetchTestRateById returned nothing')
    }

    return result.data.fetchRate.rate
}

const createAndSubmitTestRate = async (
    server: ApolloServer,
    rateData?: InsertRateArgsType
): Promise<RateRevisionType> => {
    const rate = await createTestRate(rateData)
    return await must(submitTestRate(server, rate.id, 'Initial submission'))
}

const submitTestRate = async (server: ApolloServer, rateID: string, submittedReason: string) => {
    const updateResult = await server.executeOperation({
        query: SUBMIT_RATE,
        variables: {
            input: {
                rateID,
                submittedReason,
            },
        },
    })

    if (updateResult.errors) {
        console.info('errors', updateResult.errors)
        throw new Error(
            `submitTestRate mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('submitTestRate returned nothing')
    }

    return updateResult.data.submitRate.rate
}

const unlockTestRate = async (
    server: ApolloServer,
    rateID: string,
    unlockReason: string
) => {
    const updateResult = await server.executeOperation({
        query: UNLOCK_RATE,
        variables: {
            input: {
                rateID,
                unlockReason,
            },
        },
    })

    if (updateResult.errors) {
        console.info('errors', updateResult.errors)
        throw new Error(
            `unlockRate mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('unlockTestRate returned nothing')
    }

    return updateResult.data.unlockRate.rate
}

// USING PRISMA DIRECTLY BELOW ---  we have no createRate or updateRate resolvers yet, but we have integration tests needing the workflows
const createTestRate = async (
    rateData?: Partial<InsertRateArgsType>
): Promise<RateType> => {
    const prismaClient = await sharedTestPrismaClient()
    const defaultRateData = { ...mockDraftRate(), stateCode: 'FL'}
    const initialData ={
        ...defaultRateData,
        ...rateData // override with any new fields passed in
    }
    const programs = initialData.stateCode
        ? [must(findStatePrograms(initialData.stateCode))[0]]
        : [defaultFloridaRateProgram()]

    const programIDs = programs.map((program) => program.id)

    const draftRateData = mockInsertRateArgs({
        rateProgramIDs: programIDs,
        actuaryCommunicationPreference: undefined,
        addtlActuaryContacts: [],
       amendmentEffectiveDateEnd: undefined,
       amendmentEffectiveDateStart: undefined,
        certifyingActuaryContacts: [],
       id: 'd2404a25-e1b9-4441-92b2-0fb8c8a6ae3b',
        packagesWithSharedRateCerts: [],
       rateCapitationType: undefined,
       rateCertificationName: undefined,
       rateDateCertified: undefined,
       rateDateEnd: undefined,
       rateDateStart: undefined,
        // ...rateData
    })

    return must(await insertDraftRate(prismaClient, draftRateData))
}

const updateTestRate = async (
    rateID: string,
    rateData: RateFormEditable
): Promise<RateType> => {
    const prismaClient = await sharedTestPrismaClient()

    return must(
        await updateDraftRate(prismaClient, {
            rateID: rateID,
            formData: rateData,
            contractIDs: [],
        })
    )
}

export {
    createTestRate,
    createAndSubmitTestRate,
    fetchTestRateById,
    submitTestRate,
    unlockTestRate,
    updateTestRate,
}
