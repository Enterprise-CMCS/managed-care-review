import type { ApolloServer } from '@apollo/server'
import {
    AdminCreateContractQuestionResponseDocument,
    type AdminCreateContractQuestionResponseInput,
    type ContractQuestion,
} from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    createTestQuestion,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { assertAnError, assertAnErrorCode } from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    createDBUsersWithFullData,
    testAdminUser,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import {
    approveTestContract,
    createAndSubmitTestContractWithRate,
    withdrawTestContract,
} from '../../testHelpers/gqlContractHelpers'

const responseDocuments = [
    {
        name: 'Admin Response',
        s3URL: 's3://bucketname/key/admin-response',
    },
]

const adminCreateTestContractQuestionResponse = async (
    server: ApolloServer,
    input: AdminCreateContractQuestionResponseInput
): Promise<ContractQuestion> => {
    const result = await executeGraphQLOperation(server, {
        query: AdminCreateContractQuestionResponseDocument,
        variables: { input },
    })

    if (result.errors) {
        throw new Error(
            `adminCreateContractQuestionResponse mutation failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    const question = result.data?.adminCreateContractQuestionResponse.question
    if (!question) {
        throw new Error('adminCreateContractQuestionResponse returned nothing')
    }

    return question
}

describe('adminCreateContractQuestionResponse', () => {
    const adminUser = testAdminUser()
    const cmsUser = testCMSUser()
    const stateUser = testStateUser({
        email: 'on-behalf-state@example.com',
    })

    beforeAll(async () => {
        await createDBUsersWithFullData([adminUser, cmsUser, stateUser])
    })

    it('records an admin response on a CMS-authored question, attributed to the state user', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        // CMS asks the question; the admin backfills the state's response
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        const question = await adminCreateTestContractQuestionResponse(
            adminServer,
            {
                questionID: cmsQuestion.id,
                addedByUserID: stateUser.id,
                reason: 'Recording prior response',
                documents: responseDocuments,
            }
        )

        expect(question.id).toBe(cmsQuestion.id)
        expect(question.responses).toHaveLength(1)
        expect(question.responses[0]).toEqual(
            expect.objectContaining({
                addedBy: expect.objectContaining({
                    id: stateUser.id,
                    role: 'STATE_USER',
                }),
                documents: expect.arrayContaining([
                    expect.objectContaining({ name: 'Admin Response' }),
                ]),
            })
        )
    })

    it('returns a FORBIDDEN error when a non-admin attempts an admin response', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        const result = await executeGraphQLOperation(stateServer, {
            query: AdminCreateContractQuestionResponseDocument,
            variables: {
                input: {
                    questionID: cmsQuestion.id,
                    addedByUserID: stateUser.id,
                    reason: 'Recording prior response',
                    documents: responseDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
        expect(assertAnError(result).message).toBe(
            'user not authorized to create an admin question response'
        )
    })

    it('returns a BAD_USER_INPUT error when no response documents are provided', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionResponseDocument,
            variables: {
                input: {
                    questionID: cmsQuestion.id,
                    addedByUserID: stateUser.id,
                    reason: 'Recording prior response',
                    documents: [],
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'question response documents are required'
        )
    })

    it('allows recording a response on an approved contract (corrective use case)', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)
        await approveTestContract(cmsServer, contract.id)

        const question = await adminCreateTestContractQuestionResponse(
            adminServer,
            {
                questionID: cmsQuestion.id,
                addedByUserID: stateUser.id,
                reason: 'Recording prior response',
                documents: responseDocuments,
            }
        )

        expect(question.responses).toHaveLength(1)
        expect(question.responses[0].addedBy).toEqual(
            expect.objectContaining({ id: stateUser.id, role: 'STATE_USER' })
        )
    })

    it('returns a BAD_USER_INPUT error when the question contract is WITHDRAWN', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)
        await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw test contract'
        )

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionResponseDocument,
            variables: {
                input: {
                    questionID: cmsQuestion.id,
                    addedByUserID: stateUser.id,
                    reason: 'Recording prior response',
                    documents: responseDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'Issue creating response for contract. Message: Cannot create response for contract in WITHDRAWN status'
        )
    })

    it('returns a BAD_USER_INPUT error when the question does not exist', async () => {
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionResponseDocument,
            variables: {
                input: {
                    questionID: '550e8400-e29b-41d4-a716-446655440000',
                    addedByUserID: stateUser.id,
                    reason: 'Recording prior response',
                    documents: responseDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
    })

    it('attributes the response to a selected state user', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        const question = await adminCreateTestContractQuestionResponse(
            adminServer,
            {
                questionID: cmsQuestion.id,
                addedByUserID: stateUser.id,
                reason: 'Recording prior response',
                documents: responseDocuments,
            }
        )

        expect(question.responses[0].addedBy).toEqual(
            expect.objectContaining({
                id: stateUser.id,
                role: 'STATE_USER',
            })
        )
    })

    it('returns a BAD_USER_INPUT error when addedByUserID is not a state user', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionResponseDocument,
            variables: {
                input: {
                    questionID: cmsQuestion.id,
                    addedByUserID: cmsUser.id,
                    reason: 'Recording prior response',
                    documents: responseDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'addedByUserID must reference a state user'
        )
    })

    it('returns a BAD_USER_INPUT error when no reason is provided', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionResponseDocument,
            variables: {
                input: {
                    questionID: cmsQuestion.id,
                    addedByUserID: stateUser.id,
                    reason: '   ',
                    documents: responseDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe('a reason is required')
    })

    it('returns a BAD_USER_INPUT error when the response date is in the future', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionResponseDocument,
            variables: {
                input: {
                    questionID: cmsQuestion.id,
                    addedByUserID: stateUser.id,
                    reason: 'Recording prior response',
                    createdAt: '2999-01-01',
                    documents: responseDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'the response date cannot be in the future'
        )
    })

    it('returns a BAD_USER_INPUT error when the response date is before the question was created', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        // The question was created now; a 2020 response predates it.
        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionResponseDocument,
            variables: {
                input: {
                    questionID: cmsQuestion.id,
                    addedByUserID: stateUser.id,
                    reason: 'Recording prior response',
                    createdAt: '2020-01-01',
                    documents: responseDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'the response date cannot be before the question was created'
        )
    })

    it('records an ADMIN_CREATE response action with the reason and the admin', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        const question = await adminCreateTestContractQuestionResponse(
            adminServer,
            {
                questionID: cmsQuestion.id,
                addedByUserID: stateUser.id,
                reason: 'Backfilled state response',
                documents: responseDocuments,
            }
        )

        const responseID = question.responses[0].id

        const client = await sharedTestPrismaClient()
        const actions = await client.contractQuestionResponseAction.findMany({
            where: { responseID },
        })

        expect(actions).toHaveLength(1)
        expect(actions[0].action).toBe('ADMIN_CREATE')
        expect(actions[0].reason).toBe('Backfilled state response')
        expect(actions[0].updatedByID).toBe(adminUser.id)
    })

    it('does not send any notification emails for an admin-created response', async () => {
        const config = testEmailConfig()
        const mockEmailer = testEmailer(config)
        const stateServer = await constructTestPostgresServer()
        // Only the admin server uses the mock emailer, so it only observes
        // activity from the admin response (creating the CMS question uses the
        // default emailer).
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
            emailer: mockEmailer,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsQuestion = await createTestQuestion(cmsServer, contract.id)

        await adminCreateTestContractQuestionResponse(adminServer, {
            questionID: cmsQuestion.id,
            addedByUserID: stateUser.id,
            reason: 'Recording prior response',
            documents: responseDocuments,
        })

        expect(mockEmailer.sendEmail).not.toHaveBeenCalled()
    })
})
