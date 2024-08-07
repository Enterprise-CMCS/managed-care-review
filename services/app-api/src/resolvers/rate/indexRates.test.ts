import { testLDService } from '../../testHelpers/launchDarklyHelpers'

import INDEX_RATES from '../../../../app-graphql/src/queries/indexRates.graphql'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import type { RateEdge, Rate } from '../../gen/gqlServer'
import {
    iterableCmsUsersMockData,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { formatGQLDate } from '../../common-code/dateHelpers'
import {
    submitTestRate,
    unlockTestRate,
    updateTestRate,
    createAndSubmitTestContract,
} from '../../testHelpers'
import {
    createAndSubmitTestContractWithRate,
    submitTestContract,
    createAndUpdateTestContractWithRate,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-web/src/testHelpers/s3Helpers'

describe('indexRates', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole tests',
        ({ mockUser }) => {
            const ldService = testLDService({
                'rate-edit-unlock': true,
            })
            const mockS3 = testS3Client()

            it('returns rate reviews list for cms user with no errors', async () => {
                const cmsUser = mockUser()

                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })

                const contract1 =
                    await createAndSubmitTestContractWithRate(stateServer)
                const contract2 =
                    await createAndSubmitTestContractWithRate(stateServer)

                const submit1ID =
                    contract1.packageSubmissions[0].rateRevisions[0].rateID
                const submit2ID =
                    contract2.packageSubmissions[0].rateRevisions[0].rateID

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })

                expect(result.data).toBeDefined()
                const ratesIndex = result.data?.indexRates
                const testRateIDs = [submit1ID, submit2ID]

                expect(result.errors).toBeUndefined()
                const matchedTestRates: Rate[] = ratesIndex.edges
                    .map((edge: RateEdge) => edge.node)
                    .filter((test: Rate) => {
                        return testRateIDs.includes(test.id)
                    })

                expect(matchedTestRates).toHaveLength(2)
            })

            it('does not return rates still in initial draft', async () => {
                const cmsUser = mockUser()
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    s3Client: mockS3,
                })

                const contract1 =
                    await createAndUpdateTestContractWithRate(stateServer)
                const contract2 =
                    await createAndUpdateTestContractWithRate(stateServer)

                if (!contract1.draftRates || !contract2.draftRates) {
                    throw new Error('no draft rates')
                }

                // First, create new submissions
                const draft1 = contract1.draftRates[0]
                const draft2 = contract2.draftRates[0]

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })

                const ratesIndex = result.data?.indexRates
                expect(result.errors).toBeUndefined()

                // pull out test related rates and order them
                const testRateIDs = [draft1.id, draft2.id]
                const testRates: Rate[] = ratesIndex.edges
                    .map((edge: RateEdge) => edge.node)
                    .filter((test: Rate) => {
                        return testRateIDs.includes(test.id)
                    })

                expect(testRates).toHaveLength(0)
            })

            it('does not add rates when contracts without rates are submitted', async () => {
                const cmsUser = mockUser()
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })

                // create and submit new contracts
                const contract1 = await createAndSubmitTestContract()
                const contract2 = await createAndSubmitTestContract()

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })

                expect(result.errors).toBeUndefined()

                const rates = result.data?.indexRates.edges

                // Go through all of these rates and confirm that none of them are associated with either of these two new contracts
                for (const rateEdge of rates) {
                    const rateRevs = rateEdge.node.revisions
                    for (const rrev of rateRevs) {
                        const contractRevs = rrev.contractRevisions
                        for (const contractRev of contractRevs) {
                            if (
                                contractRev.contract.id === contract1.id ||
                                contractRev.contractID === contract2.id
                            ) {
                                throw new Error(
                                    'contract without rates made rates'
                                )
                            }
                        }
                    }
                }
            })

            it('returns a rate with history with correct data in each revision', async () => {
                const cmsUser = mockUser()
                const server = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })

                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })

                const contract1 =
                    await createAndSubmitTestContractWithRate(server)
                const contract2 =
                    await createAndSubmitTestContractWithRate(server)

                const firstRateID =
                    contract1.packageSubmissions[0].rateRevisions[0].rateID
                const secondRateID =
                    contract2.packageSubmissions[0].rateRevisions[0].rateID

                // Unlock one to be rate edited in place
                const firstRateUnlocked = await unlockTestRate(
                    cmsServer,
                    firstRateID,
                    'Unlock to edit an existing rate'
                )

                const secondRateUnlocked = await unlockTestRate(
                    cmsServer,
                    secondRateID,
                    'Unlock to edit an existing rate'
                )

                // update one with a new rate start and end date
                const existingFormData =
                    firstRateUnlocked.draftRevision?.formData
                expect(existingFormData).toBeDefined()
                await updateTestRate(firstRateID, {
                    rateDateStart: new Date(Date.UTC(2025, 1, 1)),
                    rateDateEnd: new Date(Date.UTC(2027, 1, 1)),
                })

                // update the other with additional new rate
                const existingFormData2 =
                    secondRateUnlocked.draftRevision?.formData
                expect(existingFormData2).toBeDefined()

                const contract3 =
                    await createAndSubmitTestContractWithRate(server)
                const newRateID =
                    contract3.packageSubmissions[0].rateRevisions[0].rateID

                // resubmit
                const firstRateResubmitted = await submitTestRate(
                    server,
                    firstRateID,
                    'Resubmit with edited rate description'
                )
                const secondRateResubmitted = await submitTestRate(
                    server,
                    secondRateID,
                    'Resubmit with an additional rate added'
                )

                // fetch rates and check that the latest data is correct
                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })
                expect(result.errors).toBeUndefined()
                const rates: Rate[] = result.data?.indexRates.edges.map(
                    (edge: RateEdge) => edge.node
                )

                const resubmittedWithEdits = rates.find((test: Rate) => {
                    return test.id === firstRateResubmitted.id
                })
                const resubmittedUnchanged = rates.find((test: Rate) => {
                    return test.id == secondRateResubmitted.id
                })
                const newlyAdded = rates.find((test: Rate) => {
                    return test.id === newRateID
                })

                if (
                    !resubmittedWithEdits ||
                    !resubmittedUnchanged ||
                    !newlyAdded
                ) {
                    throw new Error('we didnt find all the new rates in index')
                }

                // Check resubmitted rate  - most recent revision and previous
                expect(resubmittedWithEdits.revisions).toHaveLength(2)

                expect(
                    resubmittedWithEdits.revisions[0].formData.rateDateStart
                ).toBe(formatGQLDate(new Date(Date.UTC(2025, 1, 1))))
                expect(
                    resubmittedWithEdits.revisions[0].formData.rateDateEnd
                ).toBe(formatGQLDate(new Date(Date.UTC(2027, 1, 1))))
                expect(
                    resubmittedWithEdits.revisions[0].submitInfo?.updatedReason
                ).toBe('Resubmit with edited rate description')
                expect(
                    resubmittedWithEdits.revisions[1].formData.rateDateStart
                ).toBe('2024-01-01')
                expect(
                    resubmittedWithEdits.revisions[1].formData.rateDateEnd
                ).toBe('2025-01-01')
                expect(
                    resubmittedWithEdits.revisions[1].submitInfo?.updatedReason
                ).toBe('Initial submission')

                // check unchanged rate most recent revision and previous
                expect(resubmittedUnchanged.revisions).toHaveLength(2)
                expect(
                    resubmittedUnchanged.revisions[0].formData.rateDateStart
                ).toBe('2024-01-01')
                expect(
                    resubmittedUnchanged.revisions[0].formData.rateDateEnd
                ).toBe('2025-01-01')
                expect(
                    resubmittedUnchanged.revisions[0].submitInfo?.updatedReason
                ).toBe('Resubmit with an additional rate added')

                expect(
                    resubmittedUnchanged.revisions[1].submitInfo?.updatedReason
                ).toBe('Initial submission')

                expect(
                    resubmittedUnchanged.revisions[1].formData.rateDateStart
                ).toBe('2024-01-01')
                expect(
                    resubmittedUnchanged.revisions[1].formData.rateDateEnd
                ).toBe('2025-01-01')

                // check newly added rate
                expect(newlyAdded.revisions).toHaveLength(1)
                expect(newlyAdded.revisions[0].formData.rateDateStart).toBe(
                    '2024-01-01'
                )
                expect(newlyAdded.revisions[0].formData.rateDateEnd).toBe(
                    '2025-01-01'
                )
            })

            it('synthesizes the right statuses as a rate is submitted/unlocked/etc', async () => {
                const cmsUser = mockUser()
                const server = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })

                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })

                // First, create new submissions
                const contract1 =
                    await createAndSubmitTestContractWithRate(server)
                const contract2 =
                    await createAndSubmitTestContractWithRate(server)
                const contract3 =
                    await createAndSubmitTestContractWithRate(server)

                const submittedRateID =
                    contract1.packageSubmissions[0].rateRevisions[0].rateID
                const unlockedRateID =
                    contract2.packageSubmissions[0].rateRevisions[0].rateID
                const relockedRateID =
                    contract3.packageSubmissions[0].rateRevisions[0].rateID

                // unlock two
                await unlockTestRate(cmsServer, unlockedRateID, 'Test reason')
                await unlockTestRate(cmsServer, relockedRateID, 'Test reason')

                // resubmit one
                await submitTestRate(
                    server,
                    relockedRateID,
                    'Test first resubmission'
                )

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })
                const ratesIndex = result.data?.indexRates
                expect(result.errors).toBeUndefined()

                // pull out test related rates and order them
                const testRateIDs = [
                    submittedRateID,
                    unlockedRateID,
                    relockedRateID,
                ]

                const testRates: Rate[] = ratesIndex.edges
                    .map((edge: RateEdge) => edge.node)
                    .filter((test: Rate) => {
                        return testRateIDs.includes(test.id)
                    })

                expect(testRates).toHaveLength(3)

                // organize test rates in a predictable order
                testRates.sort((a, b) => {
                    if (testRateIDs.indexOf(a.id) > testRateIDs.indexOf(b.id)) {
                        return 1
                    } else {
                        return -1
                    }
                })
            })

            it('returns the right revisions as a rate is submitted/unlocked/etc', async () => {
                const cmsUser = mockUser()
                const server = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })

                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })

                // First, create new rates
                const contract1 =
                    await createAndSubmitTestContractWithRate(server)
                const contract2 =
                    await createAndSubmitTestContractWithRate(server)
                const contract3 =
                    await createAndSubmitTestContractWithRate(server)

                const submittedRate2 =
                    contract1.packageSubmissions[0].rateRevisions[0]
                const unlockedRate2 =
                    contract2.packageSubmissions[0].rateRevisions[0]
                const relockedRate2 =
                    contract3.packageSubmissions[0].rateRevisions[0]

                // unlock two
                await unlockTestRate(
                    cmsServer,
                    unlockedRate2.rateID,
                    'Test reason'
                )
                await unlockTestRate(
                    cmsServer,
                    relockedRate2.rateID,
                    'Test reason'
                )

                // resubmit one
                await submitTestRate(
                    server,
                    relockedRate2.rateID,
                    'Test first resubmission'
                )

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })

                const ratesIndex = result.data?.indexRates
                expect(result.errors).toBeUndefined()

                const submittedRateID = submittedRate2.rateID
                const unlockedRateID = unlockedRate2.rateID
                const resubmittedRateID = relockedRate2.rateID

                if (!submittedRateID || !unlockedRateID || !resubmittedRateID) {
                    throw new Error('Missing Rate ID')
                }

                const testRateIDs = [
                    submittedRateID,
                    unlockedRateID,
                    resubmittedRateID,
                ]

                const ratesByID: { [id: string]: Rate } = {}
                for (const rateEdge of ratesIndex.edges) {
                    if (testRateIDs.includes(rateEdge.node.id)) {
                        ratesByID[rateEdge.node.id] = rateEdge.node
                    }
                }

                expect(Object.keys(ratesByID)).toHaveLength(3)

                const submittedRate = ratesByID[submittedRateID]
                expect(submittedRate).toBeDefined()
                expect(submittedRate.status).toBe('SUBMITTED')

                expect(submittedRate.draftRevision).toBeNull()

                expect(submittedRate.revisions).toHaveLength(1)
                expect(submittedRate.revisions[0].submitInfo).toBeTruthy()

                const unlockedRate = ratesByID[unlockedRateID]
                expect(unlockedRate).toBeDefined()
                expect(unlockedRate.status).toBe('UNLOCKED')

                expect(unlockedRate.draftRevision).toBeDefined()
                expect(unlockedRate.draftRevision?.submitInfo).toBeNull()

                expect(unlockedRate.revisions).toHaveLength(1)
                expect(unlockedRate.revisions[0].submitInfo).toBeTruthy()

                const resubmittedRate = ratesByID[resubmittedRateID]
                expect(resubmittedRate).toBeDefined()
                expect(resubmittedRate.status).toBe('RESUBMITTED')

                expect(resubmittedRate.draftRevision).toBeNull()

                expect(resubmittedRate.revisions).toHaveLength(2)
                expect(resubmittedRate.revisions[0].submitInfo).toBeTruthy()
            })

            it('return a list of submitted rates from multiple states', async () => {
                const cmsUser = mockUser()
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })
                const otherStateServer = await constructTestPostgresServer({
                    context: {
                        user: testStateUser({
                            stateCode: 'VA',
                            email: 'aang@mn.gov',
                        }),
                    },
                    ldService,
                })

                // submit packages from two different states
                const contract1 =
                    await createAndSubmitTestContractWithRate(stateServer)
                const contract2 =
                    await createAndSubmitTestContractWithRate(stateServer)

                const pkg3 = await createAndUpdateTestHealthPlanPackage(
                    otherStateServer,
                    {},
                    'VA'
                )
                const contract3 = await submitTestContract(
                    otherStateServer,
                    pkg3.id
                )

                const defaultState1 =
                    contract1.packageSubmissions[0].rateRevisions[0]
                const defaultState2 =
                    contract2.packageSubmissions[0].rateRevisions[0]
                const otherState1 =
                    contract3.packageSubmissions[0].rateRevisions[0]

                // index rates
                const result = await cmsServer.executeOperation({
                    query: INDEX_RATES,
                })

                const ratesIndex = result.data?.indexRates
                expect(result.errors).toBeUndefined()
                // Pull out only the rates results relevant to the test by using id of recently created test packages.
                const allRates: Rate[] = ratesIndex.edges.map(
                    (edge: RateEdge) => edge.node
                )
                const defaultStateRates: Rate[] = []
                const otherStateRates: Rate[] = []
                allRates.forEach((rate) => {
                    if (
                        [defaultState1.rateID, defaultState2.rateID].includes(
                            rate.id
                        )
                    ) {
                        defaultStateRates.push(rate)
                    } else if (otherState1.rateID === rate.id) {
                        otherStateRates.push(rate)
                    }
                    return
                })

                expect(defaultStateRates).toHaveLength(2)
                expect(otherStateRates).toHaveLength(1)
            })
        }
    )
})
