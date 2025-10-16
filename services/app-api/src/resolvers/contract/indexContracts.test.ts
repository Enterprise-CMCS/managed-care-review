import { IndexContractsForDashboardDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import type { Contract, ContractEdge } from '../../gen/gqlServer'
import {
    iterableCmsUsersMockData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    createTestContract,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'

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

            const submittedContract =
                await createAndSubmitTestContractWithRate(stateServer)
            // then see if we can get that same contract back from the index
            const result = await executeGraphQLOperation(stateServer, {
                query: IndexContractsForDashboardDocument,
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
            expect(theseSubmissions[1].initiallySubmittedAt).toEqual(
                submittedContract.packageSubmissions[0].submitInfo.updatedAt
            )
            expect(theseSubmissions[1].status).toBe('SUBMITTED')
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
            const result = await executeGraphQLOperation(stateServer, {
                query: IndexContractsForDashboardDocument,
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

            // setup a server with a different user
            const otherUserServer = await constructTestPostgresServer({
                context: {
                    user: testStateUser(),
                },
            })

            const result = await executeGraphQLOperation(otherUserServer, {
                query: IndexContractsForDashboardDocument,
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
            expect(testSubmission.initiallySubmittedAt).toEqual(
                stateSubmission.initiallySubmittedAt
            )
        })

        it('returns no contracts for a different states user', async () => {
            const server = await constructTestPostgresServer()
            const serverMN = await constructTestPostgresServer({
                context: {
                    user: testStateUser({
                        stateCode: 'MN',
                    }),
                },
            })

            await createTestContract(server)
            await createTestContract(serverMN, 'MN')

            const otherUserServer = await constructTestPostgresServer({
                context: {
                    user: testStateUser({
                        stateCode: 'VA',
                    }),
                },
            })

            const result = await executeGraphQLOperation(otherUserServer, {
                query: IndexContractsForDashboardDocument,
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
                const result = await executeGraphQLOperation(cmsServer, {
                    query: IndexContractsForDashboardDocument,
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
                const result = await executeGraphQLOperation(cmsServer, {
                    query: IndexContractsForDashboardDocument,
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
                    'VA' as const,
                    { submissionType: 'CONTRACT_ONLY' }
                )

                const otherState1 = await submitTestContract(
                    otherStateServer,
                    draft.id
                )

                const result = await executeGraphQLOperation(cmsServer, {
                    query: IndexContractsForDashboardDocument,
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

    describe('statusesToInclude', () => {
        it('filters out the requested statuses', async () => {
            const cmsUser = testCMSUser()

            const stateServer = await constructTestPostgresServer()
            const cmsServer = await constructTestPostgresServer({
                context: { user: cmsUser },
            })

            const approvedA =
                await createAndSubmitTestContractWithRate(stateServer)
            await approveTestContract(cmsServer, approvedA.id)
            const approvedB =
                await createAndSubmitTestContractWithRate(stateServer)
            await approveTestContract(cmsServer, approvedB.id)

            const unlocked =
                await createAndSubmitTestContractWithRate(stateServer)
            await unlockTestContract(cmsServer, unlocked.id, 'Test unlock')

            // Filter out APPROVED contracts
            const result = await executeGraphQLOperation(cmsServer, {
                query: IndexContractsForDashboardDocument,
                variables: {
                    input: {
                        statusesToExclude: ['APPROVED'],
                    },
                },
            })

            expect(result.errors).toBeUndefined()

            const nodes = result.data?.indexContracts.edges.map(
                (e: any) => e.node
            )
            expect(nodes).toBeDefined()
            expect(nodes.length).toBeGreaterThan(0)

            // Should not include any APPROVED
            expect(
                nodes.some((n: any) => n.consolidatedStatus === 'APPROVED')
            ).toBe(false)

            // expect unlocked one, exclude the approved ones
            const ids = new Set(nodes.map((n: any) => n.id))
            expect(ids.has(approvedA.id)).toBe(false)
            expect(ids.has(approvedB.id)).toBe(false)
            expect(ids.has(unlocked.id)).toBe(true)
        })
    })

    describe('updatedWithin', () => {
        it('returns only contracts who were last updated within the cutoff', async () => {
            const cmsUser = testCMSUser()

            const stateServer = await constructTestPostgresServer()
            const cmsServer = await constructTestPostgresServer({
                context: { user: cmsUser },
            })

            // simulate a time gap
            let oldContract: any
            await new Promise<void>((resolve) => {
                setTimeout(() => {
                    oldContract =
                        createAndSubmitTestContractWithRate(stateServer)
                    resolve()
                }, 5000)
            })
            // create a recent contract
            const recentContract =
                await createAndSubmitTestContractWithRate(stateServer)

            // then query with updatedWithin = 5 seconds
            const result = await executeGraphQLOperation(cmsServer, {
                query: IndexContractsForDashboardDocument,
                variables: { input: { updatedWithin: 5 } },
            })

            expect(result.errors).toBeUndefined()

            const nodes =
                result.data?.indexContracts.edges.map((e: any) => e.node) ?? []

            // Should include the recent one
            const hasRecent = nodes.some((n: any) => n.id === recentContract.id)
            expect(hasRecent).toBe(true)

            // Should exclude the oldContract one
            const hasoldContract = nodes.some(
                (n: any) => n.id === oldContract.id
            )
            expect(hasoldContract).toBe(false)
        })
    })
})
