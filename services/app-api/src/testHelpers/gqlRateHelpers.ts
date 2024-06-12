import SUBMIT_RATE from 'app-graphql/src/mutations/submitRate.graphql'
import FETCH_RATE from 'app-graphql/src/queries/fetchRate.graphql'
import UNLOCK_RATE from 'app-graphql/src/mutations/unlockRate.graphql'
import UPDATE_DRAFT_CONTRACT_RATES from 'app-graphql/src/mutations/updateDraftContractRates.graphql'
import { must } from './assertionHelpers'
import { defaultFloridaRateProgram } from './gqlHelpers'
import { mockRateFormDataInput } from './rateDataMocks'
import { sharedTestPrismaClient } from './storeHelpers'
import { updateDraftRate } from '../postgres/contractAndRates/updateDraftRate'

import type {
    Contract,
    RateFormData,
    ActuaryContact,
    ActuaryContactInput,
    RateFormDataInput,
    UpdateDraftContractRatesInput,
    Rate,
} from '../gen/gqlServer'
import type { RateType } from '../domain-models'
import type { ApolloServer } from 'apollo-server-lambda'
import type { RateFormEditableType } from '../domain-models/contractAndRates'
import { createAndSubmitTestContractWithRate } from './gqlContractHelpers'

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

// rates must be initially submitted with a contract before they can be unlocked and submitted on their own.
async function createSubmitAndUnlockTestRate(
    stateServer: ApolloServer,
    cmsServer: ApolloServer
): Promise<Rate> {
    const contract = await createAndSubmitTestContractWithRate(stateServer)
    const rateRevision = contract.packageSubmissions[0].rateRevisions[0]
    const rateID = rateRevision.rateID

    const unlockedRate = await unlockTestRate(cmsServer, rateID, 'test unlock')

    return unlockedRate
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
    contract: Contract,
    rateFormDataOverrides?: Partial<RateFormDataInput>
): Promise<Contract> {
    const rateUpdateInput = updateRatesInputFromDraftContract(contract)
    const addedInput = addNewRateToRateInput(
        rateUpdateInput,
        rateFormDataOverrides
    )

    return await updateTestDraftRatesOnContract(server, addedInput)
}

function addNewRateToRateInput(
    input: UpdateDraftContractRatesInput,
    rateFormDataOverrides?: Partial<RateFormDataInput>
): UpdateDraftContractRatesInput {
    const newFormData: RateFormDataInput = {
        rateType: 'AMENDMENT',
        rateCapitationType: 'RATE_CELL',
        rateDateStart: '2024-01-01',
        rateDateEnd: '2025-01-01',
        rateDateCertified: '2024-01-02',
        amendmentEffectiveDateStart: '2024-02-01',
        amendmentEffectiveDateEnd: '2025-02-01',
        rateProgramIDs: [defaultFloridaRateProgram().id],
        deprecatedRateProgramIDs: [],

        rateDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'ratedoc1.doc',
                sha256: 'foobar',
            },
        ],
        supportingDocuments: [
            {
                s3URL: 's3://bucketname/key/test1',
                name: 'ratesupdoc1.doc',
                sha256: 'foobar1',
            },
            {
                s3URL: 's3://bucketname/key/test1',
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

        ...rateFormDataOverrides,
    }

    return {
        contractID: input.contractID,
        updatedRates: [
            ...input.updatedRates,
            {
                type: 'CREATE' as const,
                formData: newFormData,
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

function formatGQLRateContractForSending(
    contact: ActuaryContact
): ActuaryContactInput {
    return {
        ...contact,
        id: contact.id || undefined,
        actuarialFirmOther: contact.actuarialFirmOther || undefined,
    }
}

function formatRateDataForSending(
    rateFormData: RateFormData
): RateFormDataInput {
    return {
        rateType: rateFormData.rateType,
        rateCapitationType: rateFormData.rateCapitationType,
        rateDocuments: rateFormData.rateDocuments,
        supportingDocuments: rateFormData.supportingDocuments,
        rateDateStart: rateFormData.rateDateStart,
        rateDateEnd: rateFormData.rateDateEnd,
        rateDateCertified: rateFormData.rateDateCertified,
        amendmentEffectiveDateStart: rateFormData.amendmentEffectiveDateStart,
        amendmentEffectiveDateEnd: rateFormData.amendmentEffectiveDateEnd,
        deprecatedRateProgramIDs: rateFormData.deprecatedRateProgramIDs,
        rateProgramIDs: rateFormData.rateProgramIDs,
        rateCertificationName: rateFormData.rateCertificationName,
        actuaryCommunicationPreference:
            rateFormData.actuaryCommunicationPreference,
        certifyingActuaryContacts: rateFormData.certifyingActuaryContacts.map(
            formatGQLRateContractForSending
        ),
        addtlActuaryContacts: rateFormData.addtlActuaryContacts
            ? rateFormData.addtlActuaryContacts.map(
                  formatGQLRateContractForSending
              )
            : undefined,
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
        if (
            rate.status === 'DRAFT' ||
            (rate.status === 'UNLOCKED' &&
                rate.parentContractID === contract.id)
        ) {
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
    rateData: RateFormEditableType
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
    createTestDraftRateOnContract,
    createSubmitAndUnlockTestRate,
    updateTestDraftRateOnContract,
    updateTestDraftRatesOnContract,
    updateRatesInputFromDraftContract,
    addNewRateToTestContract,
    addLinkedRateToTestContract,
    addLinkedRateToRateInput,
    fetchTestRateById,
    submitTestRate,
    unlockTestRate,
    updateTestRate,
    formatRateDataForSending,
}
