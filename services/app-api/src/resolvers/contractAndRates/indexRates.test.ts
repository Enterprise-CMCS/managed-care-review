import { v4 as uuidv4 } from 'uuid'

import INDEX_RATES from '../../../../app-graphql/src/queries/indexRates.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createAndUpdateTestHealthPlanPackage,
    defaultFloridaRateProgram,
    resubmitTestHealthPlanPackage,
    submitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import type { RateEdge, Rate } from '../../gen/gqlServer'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { formatGQLDate } from 'app-web/src/common-code/dateHelpers'

describe('indexRates', () => {
    const mockLDService = testLDService({ 'rates-db-refactor': true })

    it('returns ForbiddenError for state user', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        // submit packages that include rates
        await createAndSubmitTestHealthPlanPackage(stateServer)
        await createAndSubmitTestHealthPlanPackage(stateServer)

        // index rates
        const result = await stateServer.executeOperation({
            query: INDEX_RATES,
        })
        expect(result.errors).toBeDefined()
    })

    it('returns rate reviews list for cms user with no errors', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService: mockLDService,
            context: {
                user: cmsUser,
            },
        })
        // first, submit new packages that include rates
        const submit1 = await createAndSubmitTestHealthPlanPackage(stateServer)
        const submit2 = await createAndSubmitTestHealthPlanPackage(stateServer)
        const update1 = await createAndUpdateTestHealthPlanPackage(stateServer)

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        expect(result.data).toBeDefined()
        const ratesIndex = result.data?.indexRates
        const testRateIDs = [
            latestFormData(submit1).rateInfos[0].id,
            latestFormData(submit2).rateInfos[0].id,
            latestFormData(update1).rateInfos[0].id,
        ]

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
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })
        // First, create new submissions
        const draft1 = await createAndUpdateTestHealthPlanPackage(stateServer)
        const draft2 = await createAndUpdateTestHealthPlanPackage(stateServer)

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        const ratesIndex = result.data?.indexRates
        expect(result.errors).toBeUndefined()

        // pull out test related rates and order them
        const testRateIDs = [
            latestFormData(draft1).rateInfos[0].id,
            latestFormData(draft2).rateInfos[0].id,
        ]
        const testRates: Rate[] = ratesIndex.edges
            .map((edge: RateEdge) => edge.node)
            .filter((test: Rate) => {
                return testRateIDs.includes(test.id)
            })

        expect(testRates).toHaveLength(0)
    })

    it('does not add rates when contract only packages submitted', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })
        // baseline
        const initial = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const initialRates = initial.data?.indexRates.edges

        // create and submit new contract onlysubmissions
        const package1 = await createAndUpdateTestHealthPlanPackage(
            stateServer,
            { rateInfos: [], submissionType: 'CONTRACT_ONLY' }
        )
        const package2 = await createAndUpdateTestHealthPlanPackage(
            stateServer,
            { rateInfos: [], submissionType: 'CONTRACT_ONLY' }
        )
        await submitTestHealthPlanPackage(stateServer, package1.id)
        await submitTestHealthPlanPackage(stateServer, package2.id)

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
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })

        // baseline
        const initial = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const initialRates = initial.data?.indexRates.edges

        const initialDraft = await createAndUpdateTestHealthPlanPackage(
            stateServer
        )

        // turn to CHIP contract only, leave rates for now to emulate form behviavor
        const updatedToContractOnly = await updateTestHealthPlanPackage(
            stateServer,
            initialDraft.id,
            {
                submissionType: 'CONTRACT_ONLY',
                federalAuthorities: ['WAIVER_1115'],
                populationCovered: 'CHIP',
                contractAmendmentInfo: {
                    modifiedProvisions: {
                        modifiedBenefitsProvided: false,
                        modifiedGeoAreaServed: false,
                        modifiedMedicaidBeneficiaries: true,
                        modifiedMedicalLossRatioStandards: false,
                        modifiedOtherFinancialPaymentIncentive: false,
                        modifiedEnrollmentProcess: false,
                        modifiedGrevienceAndAppeal: false,
                        modifiedNetworkAdequacyStandards: false,
                        modifiedLengthOfContract: true,
                        modifiedNonRiskPaymentArrangements: false,
                    },
                },
            }
        )

        await submitTestHealthPlanPackage(stateServer, updatedToContractOnly.id)

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
        const server = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })

        // baseline
        const initial = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const initialRates = initial.data?.indexRates.edges

        const initialRateInfos = () => ({
            id: uuidv4(),
            rateType: 'NEW' as const,
            rateDateStart: new Date(Date.UTC(2025, 5, 1)),
            rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
            rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
            rateDocuments: [
                {
                    name: 'rateDocument.pdf',
                    s3URL: 'fakeS3URL',
                    sha256: 'fakesha',
                    documentCategories: ['RATES' as const],
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

        // First, create new submissions
        const firstPkg = await createAndSubmitTestHealthPlanPackage(server, {
            rateInfos: [initialRateInfos()],
        })
        const secondPkg = await createAndSubmitTestHealthPlanPackage(server, {
            rateInfos: [initialRateInfos()],
        })

        // Unlock both -  one to be rate edited in place, the other to add new rate
        const firstPkgUnlocked = await unlockTestHealthPlanPackage(
            cmsServer,
            firstPkg.id,
            'Unlock to edit an existing rate'
        )
        const secondPkgUnlocked = await unlockTestHealthPlanPackage(
            cmsServer,
            secondPkg.id,
            'Unlock to add a new rate'
        )

        // update one with a new rate start and end date
        const existingFormData = latestFormData(firstPkgUnlocked)
        expect(existingFormData.rateInfos).toHaveLength(1)
        await updateTestHealthPlanPackage(server, firstPkg.id, {
            rateInfos: [
                {
                    ...existingFormData.rateInfos[0],
                    rateDateStart: new Date(Date.UTC(2025, 1, 1)),
                    rateDateEnd: new Date(Date.UTC(2027, 1, 1)),
                },
            ],
        })

        // update the other with additional new rate
        const existingFormData2 = latestFormData(secondPkgUnlocked)
        expect(existingFormData2.rateInfos).toHaveLength(1)
        await updateTestHealthPlanPackage(server, secondPkg.id, {
            rateInfos: [
                existingFormData2.rateInfos[0],
                {
                    ...initialRateInfos(),
                    id: uuidv4(), // this is a new rate
                    rateDateStart: new Date(Date.UTC(2030, 1, 1)),
                    rateDateEnd: new Date(Date.UTC(2030, 12, 1)),
                },
            ],
        })
        // resubmit both
        const firstPkgResubmitted = await resubmitTestHealthPlanPackage(
            server,
            firstPkg.id,
            'Resubmit with edited rate description'
        )
        const secondPkgResubmitted = await resubmitTestHealthPlanPackage(
            server,
            secondPkg.id,
            'Resubmit with an additional rate added'
        )

        // fetch both rates and check that the latest data is correct

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })
        const rates: Rate[] = result.data?.indexRates.edges.map(
            (edge: RateEdge) => edge.node
        )
        expect(result.errors).toBeUndefined()
        expect(rates).toHaveLength(initialRates.length + 3) // we have made three new rates

        const resubmittedWithEdits = rates.find((test: Rate) => {
            return (
                test.id === latestFormData(firstPkgResubmitted).rateInfos[0].id
            )
        })
        const resubmittedUnchanged = rates.find((test: Rate) => {
            return (
                test.id == latestFormData(secondPkgResubmitted).rateInfos[0].id
            )
        })
        const newlyAdded = rates.find((test: Rate) => {
            return (
                test.id === latestFormData(secondPkgResubmitted).rateInfos[1].id
            )
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
        const server = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })

        // First, create new submissions
        const submittedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )
        const unlockedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )
        const relockedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )

        // unlock two
        await unlockTestHealthPlanPackage(
            cmsServer,
            unlockedSubmission.id,
            'Test reason'
        )
        await unlockTestHealthPlanPackage(
            cmsServer,
            relockedSubmission.id,
            'Test reason'
        )

        // resubmit one
        await resubmitTestHealthPlanPackage(
            server,
            relockedSubmission.id,
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
            latestFormData(submittedSubmission).rateInfos[0].id,
            latestFormData(unlockedSubmission).rateInfos[0].id,
            latestFormData(relockedSubmission).rateInfos[0].id,
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
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })

        // First, create new submissions
        const submittedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )
        const unlockedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )
        const relockedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )

        // unlock two
        await unlockTestHealthPlanPackage(
            cmsServer,
            unlockedSubmission.id,
            'Test reason'
        )
        await unlockTestHealthPlanPackage(
            cmsServer,
            relockedSubmission.id,
            'Test reason'
        )

        // resubmit one
        await resubmitTestHealthPlanPackage(
            server,
            relockedSubmission.id,
            'Test first resubmission'
        )

        // index rates
        const result = await cmsServer.executeOperation({
            query: INDEX_RATES,
        })

        const ratesIndex = result.data?.indexRates
        expect(result.errors).toBeUndefined()

        const submittedRateID =
            latestFormData(submittedSubmission).rateInfos[0].id
        const unlockedRateID =
            latestFormData(unlockedSubmission).rateInfos[0].id
        const resubmittedRateID =
            latestFormData(relockedSubmission).rateInfos[0].id

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
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })
        const otherStateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang@mn.gov',
                }),
            },
            ldService: mockLDService,
        })
        // submit packages from two different states
        const defaultState1 = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )
        const defaultState2 = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )
        const draft = await createAndUpdateTestHealthPlanPackage(
            otherStateServer,
            undefined,
            'VA' as const
        )
        const otherState1 = await submitTestHealthPlanPackage(
            otherStateServer,
            draft.id
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
            if (
                [
                    latestFormData(defaultState1).rateInfos[0].id,
                    latestFormData(defaultState2).rateInfos[0].id,
                ].includes(rate.id)
            ) {
                defaultStateRates.push(rate)
            } else if (
                [latestFormData(otherState1).rateInfos[0].id].includes(rate.id)
            ) {
                otherStateRates.push(rate)
            }
            return
        })

        expect(defaultStateRates).toHaveLength(2)
        expect(otherStateRates).toHaveLength(1)
    })
})
