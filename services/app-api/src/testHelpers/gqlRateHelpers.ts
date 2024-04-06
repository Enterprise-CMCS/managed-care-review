import SUBMIT_RATE from 'app-graphql/src/mutations/submitRate.graphql'
import FETCH_RATE from 'app-graphql/src/queries/fetchRate.graphql'
import UNLOCK_RATE from 'app-graphql/src/mutations/unlockRate.graphql'
import UPDATE_DRAFT_CONTRACT_RATES from 'app-graphql/src/mutations/updateDraftContractRates.graphql'
import { findStatePrograms } from '../postgres'
import { must } from './assertionHelpers'
import { defaultFloridaRateProgram } from './gqlHelpers'
import {
    mockDraftRate,
    mockInsertRateArgs,
    mockRateFormDataInput,
} from './rateDataMocks'
import { sharedTestPrismaClient } from './storeHelpers'
import { insertDraftRate } from '../postgres/contractAndRates/insertRate'
import { updateDraftRate } from '../postgres/contractAndRates/updateDraftRate'

import type {
    Contract,
    RateFormData,
    ActuaryContact,
    ActuaryContactInput,
    RateFormDataInput,
    UpdateDraftContractRatesInput,
} from '../gen/gqlServer'
import type { RateType } from '../domain-models'
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

    if (result.errors) {
        throw new Error(
            `fetchTestRateById query failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('fetchTestRateById returned nothing')
    }

    return result.data.fetchRate.rate
}

const createAndSubmitTestRate = async (
    server: ApolloServer,
    rateData?: InsertRateArgsType
): Promise<RateType> => {
    const rate = await createTestRate(rateData)
    return await must(submitTestRate(server, rate.id, 'Initial submission'))
}

const submitTestRate = async (
    server: ApolloServer,
    rateID: string,
    submittedReason: string
): Promise<RateType> => {
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
    unlockedReason: string
) => {
    const updateResult = await server.executeOperation({
        query: UNLOCK_RATE,
        variables: {
            input: {
                rateID,
                unlockedReason,
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
    const defaultRateData = { ...mockDraftRate() }
    const initialData = {
        ...defaultRateData,
        ...rateData, // override with any new fields passed in
    }
    const programs = initialData.stateCode
        ? [must(findStatePrograms(initialData.stateCode))[0]]
        : [defaultFloridaRateProgram()]

    const programIDs = programs.map((program) => program.id)

    const draftRateData = mockInsertRateArgs({
        ...initialData,
        rateProgramIDs: programIDs,
        stateCode: 'FL',
    })

    return must(await insertDraftRate(prismaClient, draftRateData))
}

async function updateTestDraftRatesOnContract(
    server: ApolloServer,
    input: UpdateDraftContractRatesInput
): Promise<Contract> {
    const updateResult = await server.executeOperation({
        query: UPDATE_DRAFT_CONTRACT_RATES,
        variables: {
            input,
        },
    })

    if (updateResult.errors || !updateResult.data) {
        throw new Error(
            `updateDraftContractRates mutation failed with errors ${updateResult.errors}`
        )
    }

    return updateResult.data.updateDraftContractRates.contract
}

async function addNewRateToTestContract(
    server: ApolloServer,
    contract: Contract
): Promise<Contract> {
    const rateUpdateInput = updateRatesInputFromDraftContract(contract)

    const addedInput = addNewRateToRateInput(rateUpdateInput)

    return await updateTestDraftRatesOnContract(server, addedInput)
}

function addNewRateToRateInput(
    input: UpdateDraftContractRatesInput
): UpdateDraftContractRatesInput {
    return {
        contractID: input.contractID,
        updatedRates: [
            ...input.updatedRates,
            {
                type: 'CREATE' as const,
                formData: {
                    rateType: 'AMENDMENT',
                    rateCapitationType: 'RATE_CELL',
                    rateDateStart: '2024-01-01',
                    rateDateEnd: '2025-01-01',
                    rateDateCertified: '2024-01-02',
                    amendmentEffectiveDateStart: '2024-02-01',
                    amendmentEffectiveDateEnd: '2025-02-01',
                    rateProgramIDs: [defaultFloridaRateProgram().id],

                    rateDocuments: [
                        {
                            s3URL: 'foo://bar',
                            name: 'ratedoc1.doc',
                            sha256: 'foobar',
                        },
                    ],
                    supportingDocuments: [
                        {
                            s3URL: 'foo://bar1',
                            name: 'ratesupdoc1.doc',
                            sha256: 'foobar1',
                        },
                        {
                            s3URL: 'foo://bar2',
                            name: 'ratesupdoc2.doc',
                            sha256: 'foobar2',
                        },
                    ],
                    certifyingActuaryContacts: [
                        {
                            name: 'Foo Person',
                            titleRole: 'Bar Job',
                            email: 'foo@example.com',
                            actuarialFirm: 'GUIDEHOUSE',
                        },
                    ],
                    addtlActuaryContacts: [
                        {
                            name: 'Bar Person',
                            titleRole: 'Baz Job',
                            email: 'bar@example.com',
                            actuarialFirm: 'OTHER',
                            actuarialFirmOther: 'Some Firm',
                        },
                    ],
                    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                    packagesWithSharedRateCerts: [],
                },
            },
        ],
    }
}

async function addLinkedRateToTestContract(
    server: ApolloServer,
    contract: Contract,
    rateID: string
): Promise<Contract> {
    const rateUpdateInput = updateRatesInputFromDraftContract(contract)

    const addedInput = addLinkedRateToRateInput(rateUpdateInput, rateID)

    return await updateTestDraftRatesOnContract(server, addedInput)
}

function addLinkedRateToRateInput(
    input: UpdateDraftContractRatesInput,
    rateID: string
): UpdateDraftContractRatesInput {
    return {
        contractID: input.contractID,
        updatedRates: [
            ...input.updatedRates,
            {
                type: 'LINK' as const,
                rateID,
            },
        ],
    }
}

function formatGQLRateContractForSending(contact: ActuaryContact): ActuaryContactInput {
    return {
        ...contact,
        id: contact.id || undefined,
        actuarialFirmOther: contact.actuarialFirmOther || undefined
    }
}

function formatRateDataForSending(rateFormData: RateFormData): RateFormDataInput {
    return {
        ...rateFormData,
        certifyingActuaryContacts: rateFormData.certifyingActuaryContacts.map(formatGQLRateContractForSending),
        addtlActuaryContacts: rateFormData.addtlActuaryContacts ? rateFormData.addtlActuaryContacts.map(formatGQLRateContractForSending) : undefined,
    }
}


function updateRatesInputFromDraftContract(
    contract: Contract
): UpdateDraftContractRatesInput {
    const draftRates = contract.draftRates
    if (!draftRates) {
        throw new Error('attempted to grab rate input from non-draft contract')
    }

    const rateInputs = draftRates.map((rate) => {
        if (rate.status === 'DRAFT' || (rate.status === 'UNLOCKED' && rate.parentContractID === contract.id)) {
            // this is an editable child rate
            const revision = rate.draftRevision
            if (!revision) {
                console.error(
                    'programming error no draft revision found for rate',
                    rate
                )
                throw new Error('No revision found for rate')
            }
            return {
                type: 'UPDATE' as const,
                rateID: rate.id,
                formData: formatRateDataForSending(revision.formData),
            }
        } else {
            // this is a linked rate. 
            return {
                type: 'LINK' as const,
                rateID: rate.id,
            }
        }
    })

    return {
        contractID: contract.id,
        updatedRates: rateInputs,
    }
}

const createTestDraftRateOnContract = async (
    server: ApolloServer,
    contractID: string,
    rateData?: RateFormDataInput
): Promise<Contract> => {
    if (!rateData) {
        rateData = mockRateFormDataInput()
    }

    const updateResult = await server.executeOperation({
        query: UPDATE_DRAFT_CONTRACT_RATES,
        variables: {
            input: {
                contractID,
                updatedRates: [
                    {
                        type: 'CREATE',
                        formData: rateData,
                    },
                ],
            },
        },
    })

    if (updateResult.errors || !updateResult.data) {
        console.info('errors', updateResult.errors)
        throw new Error(
            `updateDraftContractRates mutation failed with errors ${updateResult.errors}`
        )
    }

    return updateResult.data.updateDraftContractRates.contract
}

const updateTestDraftRateOnContract = async (
    server: ApolloServer,
    contractID: string,
    rateID: string,
    rateData?: RateFormDataInput
): Promise<Contract> => {
    if (!rateData) {
        rateData = mockRateFormDataInput()
    }

    const updateResult = await server.executeOperation({
        query: UPDATE_DRAFT_CONTRACT_RATES,
        variables: {
            input: {
                contractID,
                updatedRates: [
                    {
                        type: 'UPDATE',
                        rateID,
                        formData: rateData,
                    },
                ],
            },
        },
    })

    if (updateResult.errors || !updateResult.data) {
        console.info('errors', updateResult.errors)
        throw new Error(
            `updateDraftContractRates mutation failed with errors ${updateResult.errors}`
        )
    }

    return updateResult.data.updateDraftContractRates.contract
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
    createTestDraftRateOnContract,
    updateTestDraftRateOnContract,
    updateTestDraftRatesOnContract,
    updateRatesInputFromDraftContract,
    addNewRateToTestContract,
    addLinkedRateToTestContract,
    fetchTestRateById,
    submitTestRate,
    unlockTestRate,
    updateTestRate,
}
