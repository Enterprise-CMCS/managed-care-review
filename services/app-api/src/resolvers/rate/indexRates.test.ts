import { v4 as uuidv4 } from 'uuid'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'

import INDEX_RATES from '../../../../app-graphql/src/queries/indexRates.graphql'
import {
    constructTestPostgresServer,
    defaultFloridaRateProgram,
} from '../../testHelpers/gqlHelpers'
import type { StateCodeType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { RateEdge, Rate } from '../../gen/gqlServer'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import { formatGQLDate } from 'app-web/src/common-code/dateHelpers'
import {
    submitTestRate,
    createAndSubmitTestRate,
    createTestRate,
    unlockTestRate,
    updateTestRate,
    createAndSubmitTestContract,
    createTestContract,
} from '../../testHelpers'

describe('indexRates', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })

    it('returns rate reviews list for cms user with no errors', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({ ldService })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
        })
        // first, submit 2 rates
        const submit1 = await createAndSubmitTestRate(stateServer)
        const submit2 = await createAndSubmitTestRate(stateServer)

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        expect(result.data).toBeDefined()
        const ratesIndex = result.data?.indexRates
        const testRateIDs = [submit1.id, submit2.id]

        expect(result.errors).toBeUndefined()
        const matchedTestRates: Rate[] = ratesIndex.edges
            .map((edge: RateEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })

        expect(matchedTestRates).toHaveLength(2)
    })

    it('does not return rates still in initial draft', async () => {
        const cmsUser = testCMSUser()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        // First, create new submissions
        const draft1 = await createTestRate()
        const draft2 = await createTestRate()

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
        const cmsUser = testCMSUser()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
        })
        // baseline
        const initial = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const initialRates = initial.data?.indexRates.edges

        // create and submit new contracts
        await createAndSubmitTestContract()
        await createAndSubmitTestContract()

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        expect(result.errors).toBeUndefined()

        const rates = result.data?.indexRates.edges
        expect(rates).toHaveLength(initialRates.length)
        expect(rates).toEqual(initialRates)
    })

    it('does not add rates a for draft contract and rates package that is submitted later as contract only', async () => {
        const cmsUser = testCMSUser()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
        })

        // baseline
        const initial = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const initialRates = initial.data?.indexRates.edges

        // turn to CHIP contract only, leave rates for now to emulate form behviavor
        await createTestContract()

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        const rates = result.data?.indexRates.edges
        expect(result.errors).toBeUndefined()

        expect(rates).toHaveLength(initialRates.length)
        expect(rates).toEqual(initialRates)
    })

    it('returns a rate with history with correct data in each revision', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({ ldService })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
        })

        // baseline
        const initial = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        const initialRates = initial.data?.indexRates.edges
        const florida: StateCodeType = 'FL'
        const initialRateInfos = () => ({
            id: uuidv4(),
            rateType: 'NEW' as const,
            rateDateStart: new Date(Date.UTC(2025, 5, 1)),
            rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
            rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
            stateCode: florida,
            rateDocuments: [
                {
                    name: 'rateDocument.pdf',
                    s3URL: 'fakeS3URL',
                    sha256: 'fakesha',
                },
            ],
            supportingDocuments: [],
            rateProgramIDs: [defaultFloridaRateProgram().id],
            actuaryContacts: [
                {
                    name: 'test name',
                    titleRole: 'test title',
                    email: 'email@example.com',
                    actuarialFirm: 'MERCER' as const,
                    actuarialFirmOther: '',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY' as const,
            packagesWithSharedRateCerts: [],
        })

        // First, create and submit new rates
        const firstRate = await createAndSubmitTestRate(server, {
            ...initialRateInfos(),
        })
        const secondRate = await createAndSubmitTestRate(server, {
            ...initialRateInfos(),
        })

        // Unlock one to be rate edited in place
        const firstRateUnlocked = await unlockTestRate(
            cmsServer,
            firstRate.id,
            'Unlock to edit an existing rate'
        )

        const secondRateUnlocked = await unlockTestRate(
            cmsServer,
            secondRate.id,
            'Unlock to edit an existing rate'
        )

        // update one with a new rate start and end date
        const existingFormData = firstRateUnlocked.draftRevision?.formData
        expect(existingFormData).toBeDefined()
        await updateTestRate(firstRate.id, {
            rateDateStart: new Date(Date.UTC(2025, 1, 1)),
            rateDateEnd: new Date(Date.UTC(2027, 1, 1)),
        })

        // update the other with additional new rate
        const existingFormData2 = secondRateUnlocked.draftRevision?.formData
        expect(existingFormData2).toBeDefined()
        const newRate = await createAndSubmitTestRate(server, {
            ...initialRateInfos(),
            rateDateStart: new Date(Date.UTC(2030, 1, 1)),
            rateDateEnd: new Date(Date.UTC(2030, 12, 1)),
        })

        // resubmit
        const firstRateResubmitted = await submitTestRate(
            server,
            firstRate.id,
            'Resubmit with edited rate description'
        )
        const secondRateResubmitted = await submitTestRate(
            server,
            secondRate.id,
            'Resubmit with an additional rate added'
        )

        // fetch rates and check that the latest data is correct
        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const rates: Rate[] = result.data?.indexRates.edges.map(
            (edge: RateEdge) => edge.node
        )
        expect(result.errors).toBeUndefined()
        expect(rates).toHaveLength(initialRates.length + 3) // we have made 2 new rates

        const resubmittedWithEdits = rates.find((test: Rate) => {
            return test.id === firstRateResubmitted.id
        })
        const resubmittedUnchanged = rates.find((test: Rate) => {
            return test.id == secondRateResubmitted.id
        })
        const newlyAdded = rates.find((test: Rate) => {
            return test.id === newRate.id
        })

        if (!resubmittedWithEdits || !resubmittedUnchanged || !newlyAdded) {
            throw new Error('Rates coming back are entirely unexpected')
        }

        // Check resubmitted rate  - most recent revision and previous
        expect(resubmittedWithEdits.revisions).toHaveLength(2)

        expect(resubmittedWithEdits.revisions[0].formData.rateDateStart).toBe(
            formatGQLDate(new Date(Date.UTC(2025, 1, 1)))
        )
        expect(resubmittedWithEdits.revisions[0].formData.rateDateEnd).toBe(
            formatGQLDate(new Date(Date.UTC(2027, 1, 1)))
        )
        expect(
            resubmittedWithEdits.revisions[0].submitInfo?.updatedReason
        ).toBe('Resubmit with edited rate description')
        expect(resubmittedWithEdits.revisions[1].formData.rateDateStart).toBe(
            formatGQLDate(initialRateInfos().rateDateStart)
        )
        expect(resubmittedWithEdits.revisions[1].formData.rateDateEnd).toBe(
            formatGQLDate(initialRateInfos().rateDateEnd)
        )
        expect(
            resubmittedWithEdits.revisions[1].submitInfo?.updatedReason
        ).toBe('Initial submission')

        // check unchanged rate most recent revision and previous
        expect(resubmittedUnchanged.revisions).toHaveLength(2)
        expect(resubmittedUnchanged.revisions[0].formData.rateDateStart).toBe(
            formatGQLDate(initialRateInfos().rateDateStart)
        )
        expect(resubmittedUnchanged.revisions[0].formData.rateDateEnd).toBe(
            formatGQLDate(initialRateInfos().rateDateEnd)
        )
        expect(
            resubmittedUnchanged.revisions[0].submitInfo?.updatedReason
        ).toBe('Resubmit with an additional rate added')

        expect(
            resubmittedUnchanged.revisions[1].submitInfo?.updatedReason
        ).toBe('Initial submission')

        expect(resubmittedUnchanged.revisions[1].formData.rateDateStart).toBe(
            formatGQLDate(initialRateInfos().rateDateStart)
        )
        expect(resubmittedUnchanged.revisions[1].formData.rateDateEnd).toBe(
            formatGQLDate(initialRateInfos().rateDateEnd)
        )

        // check newly added rate
        expect(newlyAdded.revisions).toHaveLength(1)
        expect(newlyAdded.revisions[0].formData.rateDateStart).toBe(
            formatGQLDate(new Date(Date.UTC(2030, 1, 1)))
        )
        expect(newlyAdded.revisions[0].formData.rateDateEnd).toBe(
            formatGQLDate(new Date(Date.UTC(2030, 12, 1)))
        )
    })

    it('synthesizes the right statuses as a rate is submitted/unlocked/etc', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({ ldService })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
        })

        // First, create new submissions
        const submittedRate = await createAndSubmitTestRate(server)
        const unlockedRate = await createAndSubmitTestRate(server)
        const relockedRate = await createAndSubmitTestRate(server)

        // unlock two
        await unlockTestRate(cmsServer, unlockedRate.id, 'Test reason')
        await unlockTestRate(cmsServer, relockedRate.id, 'Test reason')

        // resubmit one
        await submitTestRate(server, relockedRate.id, 'Test first resubmission')

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const ratesIndex = result.data?.indexRates
        expect(result.errors).toBeUndefined()

        // pull out test related rates and order them
        const testRateIDs = [submittedRate.id, unlockedRate.id, relockedRate.id]

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
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({ ldService })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
        })

        // First, create new rates
        const submittedRate2 = await createAndSubmitTestRate(server)
        const unlockedRate2 = await createAndSubmitTestRate(server)
        const relockedRate2 = await createAndSubmitTestRate(server)

        // unlock two
        await unlockTestRate(cmsServer, unlockedRate2.id, 'Test reason')
        await unlockTestRate(cmsServer, relockedRate2.id, 'Test reason')

        // resubmit one
        await submitTestRate(
            server,
            relockedRate2.id,
            'Test first resubmission'
        )

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        const ratesIndex = result.data?.indexRates
        expect(result.errors).toBeUndefined()

        const submittedRateID = submittedRate2.id
        const unlockedRateID = unlockedRate2.id
        const resubmittedRateID = relockedRate2.id

        if (!submittedRateID || !unlockedRateID || !resubmittedRateID) {
            throw new Error('Missing Rate ID')
        }

        const testRateIDs = [submittedRateID, unlockedRateID, resubmittedRateID]

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
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({ ldService })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
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
        const defaultState1 = await createAndSubmitTestRate(stateServer)
        const defaultState2 = await createAndSubmitTestRate(stateServer)
        const draft = await createTestRate()

        const otherState1 = await submitTestRate(
            otherStateServer,
            draft.id,
            'submitted reason'
        )

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
            if ([defaultState1.id, defaultState2.id].includes(rate.id)) {
                defaultStateRates.push(rate)
            } else if (otherState1.id === rate.id) {
                otherStateRates.push(rate)
            }
            return
        })

        expect(defaultStateRates).toHaveLength(2)
        expect(otherStateRates).toHaveLength(1)
    })
})
