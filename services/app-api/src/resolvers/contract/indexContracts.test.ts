import INDEX_CONTRACTS from '../../../../app-graphql/src/queries/indexContracts.graphql'
import {
    constructTestPostgresServer,
    createTestHealthPlanPackage,
    createAndSubmitTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { todaysDate } from '../../testHelpers/dateHelpers'
import type { Contract, ContractEdge } from '../../gen/gqlServer'
import {
    iterableCmsUsersMockData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-web/src/testHelpers/s3Helpers'

describe(`indexContracts`, () => {
    describe('isStateUser', () => {
        const cmsUser = testCMSUser()
        const mockS3 = testS3Client()
        it('returns a list of contracts that includes newly created entries', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })
            // First, create a new contract
            const draft =
                await createAndUpdateTestContractWithoutRates(stateServer)
            const draftFormData = draft.draftRevision?.formData

            const submittedContract =
                await createAndSubmitTestContractWithRate(stateServer)
            const submittedFormData =
                submittedContract.packageSubmissions[0].contractRevision
                    .formData
            // then see if we can get that same contract back from the index
            const result = await stateServer.executeOperation({
                query: INDEX_CONTRACTS,
            })

            expect(result.errors).toBeUndefined()

            const submissionsIndex = result.data?.indexContracts

            expect(submissionsIndex.totalCount).toBeGreaterThan(1)

            // Since we don't wipe the DB between tests,filter out extraneous contracts and grab new contracts by ID to confirm they are returned
            const theseSubmissions: Contract[] = submissionsIndex.edges
                .map((edge: ContractEdge) => edge.node)
                .filter((sub: Contract) =>
                    [draft.id, submittedContract.id].includes(sub.id)
                )
            // specific contracts by id exist
            expect(theseSubmissions).toHaveLength(2)
            // confirm some contract data is correct too, first in list will be draft, second is the submitted
            expect(theseSubmissions[0].initiallySubmittedAt).toBeNull()
            expect(theseSubmissions[0].status).toBe('DRAFT')
            expect(
                theseSubmissions[0].draftRevision?.formData
                    .submissionDescription
            ).toBe(draftFormData?.submissionDescription)
            expect(theseSubmissions[1].initiallySubmittedAt).toBe(todaysDate())
            expect(theseSubmissions[1].status).toBe('SUBMITTED')
            expect(
                theseSubmissions[1].packageSubmissions[0].contractRevision
                    .formData.submissionDescription
            ).toBe(submittedFormData.submissionDescription)
        })

        it('synthesizes the right statuses as a contract is submitted/unlocked/etc', async () => {
            const stateServer = await constructTestPostgresServer({
                s3Client: mockS3,
            })

            const cmsServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
            })

            // First, create a new contracts
            const draftContract =
                await createAndUpdateTestContractWithoutRates(stateServer)
            const submittedContract =
                await createAndSubmitTestContractWithRate(stateServer)
            const unlockedContract =
                await createAndSubmitTestContractWithRate(stateServer)
            const relockedContract =
                await createAndSubmitTestContractWithRate(stateServer)

            // unlock two
            await unlockTestContract(
                cmsServer,
                unlockedContract.id,
                'Test reason'
            )
            await unlockTestContract(
                cmsServer,
                relockedContract.id,
                'Test reason'
            )

            // resubmit one
            await submitTestContract(
                stateServer,
                relockedContract.id,
                'Test first resubmission'
            )

            // index contracts api request
            const result = await stateServer.executeOperation({
                query: INDEX_CONTRACTS,
            })
            const submissionsIndex = result.data?.indexContracts

            // pull out test related contracts and order them
            const testSubmissionIDs = [
                draftContract.id,
                submittedContract.id,
                unlockedContract.id,
                relockedContract.id,
            ]
            const testContracts: Contract[] = submissionsIndex.edges
                .map((edge: ContractEdge) => edge.node)
                .filter((test: Contract) => testSubmissionIDs.includes(test.id))

            expect(testContracts).toHaveLength(4)

            // organize test contracts in a predictable order via testContractsIds array
            testContracts.sort((a, b) => {
                if (
                    testSubmissionIDs.indexOf(a.id) >
                    testSubmissionIDs.indexOf(b.id)
                ) {
                    return 1
                } else {
                    return -1
                }
            })
            expect(testContracts[0].status).toBe('DRAFT')
        })

        it('a different user from the same state can index contracts', async () => {
            const server = await constructTestPostgresServer()

            // First, create a new contract
            const stateSubmission =
                await createAndSubmitTestContractWithRate(server)
            const createdID = stateSubmission.id

            // then see if we can fetch that same contract
            const input = {
                contractID: createdID,
            }

            // setup a server with a different user
            const otherUserServer = await constructTestPostgresServer({
                context: {
                    user: testStateUser(),
                },
            })

            const result = await otherUserServer.executeOperation({
                query: INDEX_CONTRACTS,
                variables: { input },
            })

            expect(result.errors).toBeUndefined()
            const contracts = result.data?.indexContracts.edges.map(
                (edge: ContractEdge) => edge.node
            )
            expect(contracts).not.toBeNull()
            expect(contracts.length).toBeGreaterThan(1)

            const testSubmission = contracts.filter(
                (test: Contract) => test.id === createdID
            )[0]
            expect(testSubmission.initiallySubmittedAt).toBe(todaysDate())
        })

        it('returns no contracts for a different states user', async () => {
            const server = await constructTestPostgresServer()

            await createTestHealthPlanPackage(server)
            await createAndSubmitTestHealthPlanPackage(server)

            const otherUserServer = await constructTestPostgresServer({
                context: {
                    user: testStateUser({
                        stateCode: 'VA',
                    }),
                },
            })

            const result = await otherUserServer.executeOperation({
                query: INDEX_CONTRACTS,
            })

            expect(result.errors).toBeUndefined()

            const indexContracts = result.data?.indexContracts
            const otherStateContracts = indexContracts.edges.filter(
                (contract: ContractEdge) => contract.node.stateCode !== 'VA'
            )

            expect(otherStateContracts).toEqual([])
        })
    })

    describe.each(iterableCmsUsersMockData)(
        '$userRole indexContracts tests',
        ({ mockUser }) => {
            it('returns an empty list if only draft contracts exist', async () => {
                const stateServer = await constructTestPostgresServer()
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: mockUser(),
                    },
                })
                // First, create new contracts
                const draft1 =
                    await createAndUpdateTestContractWithoutRates(stateServer)
                const draft2 =
                    await createAndUpdateTestContractWithoutRates(stateServer)

                // index contracts api request
                const result = await cmsServer.executeOperation({
                    query: INDEX_CONTRACTS,
                })
                const submissionsIndex = result.data?.indexContracts

                // pull out test related contracts and order them
                const testSubmissionIDs = [draft1.id, draft2.id]
                const testContracts: Contract[] = submissionsIndex.edges
                    .map((edge: ContractEdge) => edge.node)
                    .filter((test: Contract) =>
                        testSubmissionIDs.includes(test.id)
                    )

                expect(testContracts).toHaveLength(0)
            })

            it('synthesizes the right statuses as a contract is submitted/unlocked/etc', async () => {
                const server = await constructTestPostgresServer()

                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: mockUser(),
                    },
                })

                // First, create new contracts
                const submittedContract =
                    await createAndSubmitTestContractWithRate(server)
                const unlockedContract =
                    await createAndSubmitTestContractWithRate(server)
                const relockedContract =
                    await createAndSubmitTestContractWithRate(server)

                // unlock two
                await unlockTestContract(
                    cmsServer,
                    unlockedContract.id,
                    'Test reason'
                )
                await unlockTestContract(
                    cmsServer,
                    relockedContract.id,
                    'Test reason'
                )

                // resubmit one
                await submitTestContract(
                    server,
                    relockedContract.id,
                    'Test first resubmission'
                )

                // index contracts api request
                const result = await cmsServer.executeOperation({
                    query: INDEX_CONTRACTS,
                })
                const submissionsIndex = result.data?.indexContracts

                // pull out test related contracts and order them
                const testSubmissionIDs = [
                    submittedContract.id,
                    unlockedContract.id,
                    relockedContract.id,
                ]
                const testContracts: Contract[] = submissionsIndex.edges
                    .map((edge: ContractEdge) => edge.node)
                    .filter((test: Contract) =>
                        testSubmissionIDs.includes(test.id)
                    )

                expect(testContracts).toHaveLength(3)

                // organize test contracts in a predictable order via testContractsIds array
                testContracts.sort((a, b) => {
                    if (
                        testSubmissionIDs.indexOf(a.id) >
                        testSubmissionIDs.indexOf(b.id)
                    ) {
                        return 1
                    } else {
                        return -1
                    }
                })
            })

            it('return a list of submitted contracts from multiple states', async () => {
                const stateServer = await constructTestPostgresServer()
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: mockUser(),
                    },
                })
                const otherStateServer = await constructTestPostgresServer({
                    context: {
                        user: testStateUser({
                            stateCode: 'VA',
                            email: 'aang@mn.gov',
                        }),
                    },
                })
                // submit contracts from two different states
                const defaultState1 =
                    await createAndSubmitTestContractWithRate(stateServer)
                const defaultState2 =
                    await createAndSubmitTestContractWithRate(stateServer)

                const draft = await createAndUpdateTestContractWithoutRates(
                    otherStateServer,
                    'VA' as const
                )

                const otherState1 = await submitTestContract(
                    otherStateServer,
                    draft.id
                )

                const result = await cmsServer.executeOperation({
                    query: INDEX_CONTRACTS,
                })

                expect(result.errors).toBeUndefined()

                const allContracts: Contract[] =
                    result.data?.indexContracts.edges.map(
                        (edge: ContractEdge) => edge.node
                    )

                // Pull out only the results relevant to the test by using id of recently created test contracts.
                const defaultStateContracts: Contract[] = []
                const otherStateContracts: Contract[] = []
                allContracts.forEach((pkg) => {
                    if ([defaultState1.id, defaultState2.id].includes(pkg.id)) {
                        defaultStateContracts.push(pkg)
                    } else if ([otherState1.id].includes(pkg.id)) {
                        otherStateContracts.push(pkg)
                    }
                    return
                })

                expect(defaultStateContracts).toHaveLength(2)
                expect(otherStateContracts).toHaveLength(1)
            })
        }
    )
})
