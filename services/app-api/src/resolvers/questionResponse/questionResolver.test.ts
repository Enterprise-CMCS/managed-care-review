import {
    constructTestPostgresServer,
    createTestQuestion,
} from '../../testHelpers/gqlHelpers'
import {
    testCMSUser,
    createDBUsersWithFullData,
} from '../../testHelpers/userHelpers'
import { testS3Client } from '../../testHelpers/s3Helpers'
import {
    createAndSubmitTestContract,
    fetchTestContractWithQuestions,
} from '../../testHelpers'

describe(`questionResolver`, () => {
    const mockS3 = testS3Client()
    const dmcpCMSUser = testCMSUser({
        divisionAssignment: 'DMCP',
    })

    beforeAll(async () => {
        //Inserting a new CMS user, with division assigned, in postgres in order to create the question to user relationship.
        await createDBUsersWithFullData([dmcpCMSUser])
    })

    it('populates a round number on fetch', async () => {
        const stateServer = await constructTestPostgresServer()

        const dmcpCMSServer = await constructTestPostgresServer({
            context: {
                user: dmcpCMSUser,
            },
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContract(stateServer)

        const createdDMCPQuestion = await createTestQuestion(
            dmcpCMSServer,
            contract.id,
            {
                documents: [
                    {
                        name: 'Test Question 2',
                        s3URL: 's3://bucketname/key/test12',
                    },
                ],
            }
        )

        const createdDMCPQuestion2 = await createTestQuestion(
            dmcpCMSServer,
            contract.id,
            {
                documents: [
                    {
                        name: 'Test Question 2',
                        s3URL: 's3://bucketname/key/test12',
                    },
                ],
            }
        )

        const contractWithQuestions = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )
        const indexQuestionsResult = contractWithQuestions.questions
        const firstDMCPQuestion =
            indexQuestionsResult?.DMCPQuestions.edges.find(
                (q) => q.node.id === createdDMCPQuestion.question.id
            )
        const secondDMCPQuestion =
            indexQuestionsResult?.DMCPQuestions.edges.find(
                (q) => q.node.id === createdDMCPQuestion2.question.id
            )
        expect(firstDMCPQuestion?.node.round).toBe(1)
        expect(secondDMCPQuestion?.node.round).toBe(2)
    })
})
