import type { ApolloServer } from '@apollo/server'
import {
    AdminCreateContractQuestionDocument,
    type AdminCreateContractQuestionInput,
    type ContractQuestion,
} from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    assertAnError,
    assertAnErrorCode,
    fetchTestContractWithQuestions,
} from '../../testHelpers'

import {
    createDBUsersWithFullData,
    testAdminUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    createAndSubmitTestContractWithRate,
    createTestContract,
    withdrawTestContract,
} from '../../testHelpers/gqlContractHelpers'

const questionDocuments = [
    {
        name: 'Admin Question',
        s3URL: 's3://bucketname/key/admin-question',
    },
]

const adminCreateTestContractQuestion = async (
    server: ApolloServer,
    input: AdminCreateContractQuestionInput
): Promise<ContractQuestion> => {
    const result = await executeGraphQLOperation(server, {
        query: AdminCreateContractQuestionDocument,
        variables: { input },
    })

    if (result.errors) {
        throw new Error(
            `adminCreateContractQuestion mutation failed with errors ${JSON.stringify(result.errors)}`
        )
    }

    const question = result.data?.adminCreateContractQuestion.question
    if (!question) {
        throw new Error('adminCreateContractQuestion returned nothing')
    }

    return question
}

describe('adminCreateContractQuestion', () => {
    const adminUser = testAdminUser()
    const cmsUserWithDivision = testCMSUser({
        givenName: 'OnBehalf',
        email: 'onbehalf@example.com',
        divisionAssignment: 'DMCP',
    })
    const cmsUserNoDivision = testCMSUser({
        givenName: 'NoDivision',
        email: 'nodivision@example.com',
        divisionAssignment: undefined,
    })

    beforeAll(async () => {
        await createDBUsersWithFullData([
            adminUser,
            cmsUserWithDivision,
            cmsUserNoDivision,
        ])
    })

    it('attributes the question to a selected CMS user, using that user’s division', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const question = await adminCreateTestContractQuestion(adminServer, {
            contractID: contract.id,
            addedByUserID: cmsUserWithDivision.id,
            reason: 'Recording prior Q&A',
            documents: questionDocuments,
        })

        expect(question).toEqual(
            expect.objectContaining({
                contractID: contract.id,
                // division comes from the selected CMS user, not the input
                division: 'DMCP',
                addedBy: expect.objectContaining({
                    id: cmsUserWithDivision.id,
                    role: 'CMS_USER',
                }),
            })
        )
    })

    it('records the question with a provided (past) created date', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const question = await adminCreateTestContractQuestion(adminServer, {
            contractID: contract.id,
            addedByUserID: cmsUserWithDivision.id,
            createdAt: '2024-01-15',
            reason: 'Recording prior Q&A',
            documents: questionDocuments,
        })

        expect(new Date(question.createdAt).toISOString()).toMatch(
            /^2024-01-15/
        )
    })

    it('returns a BAD_USER_INPUT error when the created date is in the future', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    addedByUserID: cmsUserWithDivision.id,
                    createdAt: '2999-01-01',
                    reason: 'Recording prior Q&A',
                    documents: questionDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'the question created date cannot be in the future'
        )
    })

    it('records an ADMIN_CREATE audit action with the reason, the admin, and the real entry time', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const question = await adminCreateTestContractQuestion(adminServer, {
            contractID: contract.id,
            addedByUserID: cmsUserWithDivision.id,
            createdAt: '2024-01-15',
            reason: 'Backfilling DMCO round 1',
            documents: questionDocuments,
        })

        // The question's createdAt is the backfilled date...
        expect(new Date(question.createdAt).toISOString()).toMatch(
            /^2024-01-15/
        )

        // ...but the audit action captures who, why, and the real entry time.
        expect(question.actions).toHaveLength(1)
        const action = question.actions?.[0]
        expect(action?.action).toBe('ADMIN_CREATE')
        expect(action?.reason).toBe('Backfilling DMCO round 1')
        expect(action?.updatedBy.id).toBe(adminUser.id)
        expect(new Date(action?.createdAt).toISOString()).not.toMatch(
            /^2024-01-15/
        )
    })

    it('returns a BAD_USER_INPUT error when no reason is provided', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    addedByUserID: cmsUserWithDivision.id,
                    reason: '   ',
                    documents: questionDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe('a reason is required')
    })

    it('returns a BAD_USER_INPUT error when addedByUserID is not a CMS user', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        // The admin themselves is not a CMS user
        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    addedByUserID: adminUser.id,
                    reason: 'Recording prior Q&A',
                    documents: questionDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'addedByUserID must reference a CMS user'
        )
    })

    it('requires a division when the selected CMS user has none and the admin supplies no division', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    addedByUserID: cmsUserNoDivision.id,
                    reason: 'Recording prior Q&A',
                    documents: questionDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'a division is required when the selected CMS user has no division assignment'
        )
    })

    it('attributes to a CMS user without a division using the admin-picked division', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const question = await adminCreateTestContractQuestion(adminServer, {
            contractID: contract.id,
            addedByUserID: cmsUserNoDivision.id,
            division: 'DMCP',
            reason: 'Recording prior Q&A',
            documents: questionDocuments,
        })

        expect(question).toEqual(
            expect.objectContaining({
                contractID: contract.id,
                division: 'DMCP',
                addedBy: expect.objectContaining({
                    id: cmsUserNoDivision.id,
                    role: 'CMS_USER',
                }),
            })
        )
    })

    it('creates a question attributed to a CMS user and their division', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const question = await adminCreateTestContractQuestion(adminServer, {
            contractID: contract.id,
            addedByUserID: cmsUserWithDivision.id,
            reason: 'Recording prior Q&A',
            documents: questionDocuments,
        })

        expect(question).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                contractID: contract.id,
                division: 'DMCP',
                addedBy: expect.objectContaining({
                    id: cmsUserWithDivision.id,
                    role: 'CMS_USER',
                }),
                responses: [],
            })
        )
    })

    it('makes the admin question visible to the state through the normal fetch path', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        await adminCreateTestContractQuestion(adminServer, {
            contractID: contract.id,
            addedByUserID: cmsUserWithDivision.id,
            reason: 'Recording prior Q&A',
            documents: questionDocuments,
        })

        const withQuestions = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )
        // cmsUserWithDivision has DMCP division
        expect(withQuestions.questions?.DMCPQuestions.totalCount).toBe(1)
    })

    it.each([
        {
            description: 'a state user',
            getUser: () => undefined, // default state server user
            useStateServer: true,
        },
        {
            description: 'a CMS user',
            getUser: () => testCMSUser(),
            useStateServer: false,
        },
    ])(
        'returns a FORBIDDEN error when $description attempts an admin question round',
        async ({ getUser, useStateServer }) => {
            const stateServer = await constructTestPostgresServer()
            const contract =
                await createAndSubmitTestContractWithRate(stateServer)

            const nonAdmin = getUser()
            let callingServer = stateServer
            if (!useStateServer && nonAdmin) {
                await createDBUsersWithFullData([nonAdmin])
                callingServer = await constructTestPostgresServer({
                    context: { user: nonAdmin },
                })
            }

            const result = await executeGraphQLOperation(callingServer, {
                query: AdminCreateContractQuestionDocument,
                variables: {
                    input: {
                        contractID: contract.id,
                        addedByUserID: cmsUserWithDivision.id,
                        reason: 'Recording prior Q&A',
                        documents: questionDocuments,
                    },
                },
            })

            expect(result.errors).toBeDefined()
            expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
            expect(assertAnError(result).message).toBe(
                'user not authorized to create an admin question round'
            )
        }
    )

    it('returns a BAD_USER_INPUT error when the contract is in DRAFT status', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const draftContract = await createTestContract(stateServer)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: draftContract.id,
                    addedByUserID: cmsUserWithDivision.id,
                    reason: 'Recording prior Q&A',
                    documents: questionDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
    })

    it('returns a BAD_USER_INPUT error when the contract is WITHDRAWN', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: testCMSUser() },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw test contract'
        )

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: withdrawnContract.id,
                    addedByUserID: cmsUserWithDivision.id,
                    reason: 'Recording prior Q&A',
                    documents: questionDocuments,
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'Issue creating question for contract. Message: Cannot create question for contract in WITHDRAWN status'
        )
    })

    it('allows adding a question to an approved contract (corrective use case)', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: testCMSUser() },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const approved = await approveTestContract(cmsServer, contract.id)

        const question = await adminCreateTestContractQuestion(adminServer, {
            contractID: approved.id,
            addedByUserID: cmsUserWithDivision.id,
            reason: 'Recording prior Q&A',
            documents: questionDocuments,
        })

        expect(question).toEqual(
            expect.objectContaining({
                contractID: approved.id,
                division: 'DMCP',
            })
        )
    })

    it('returns a BAD_USER_INPUT error when no question documents are provided', async () => {
        const stateServer = await constructTestPostgresServer()
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const result = await executeGraphQLOperation(adminServer, {
            query: AdminCreateContractQuestionDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    addedByUserID: cmsUserWithDivision.id,
                    reason: 'Recording prior Q&A',
                    documents: [],
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(assertAnError(result).message).toBe(
            'question documents are required'
        )
    })
})
