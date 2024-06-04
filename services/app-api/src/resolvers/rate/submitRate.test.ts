import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { testStateUser, testCMSUser } from '../../testHelpers/userHelpers'
import SUBMIT_RATE from '../../../../app-graphql/src/mutations/submitRate.graphql'
import FETCH_RATE from '../../../../app-graphql/src/queries/fetchRate.graphql'
import UNLOCK_RATE from '../../../../app-graphql/src/mutations/unlockRate.graphql'
import { submitTestRate, updateTestRate } from '../../testHelpers'
import SUBMIT_HEALTH_PLAN_PACKAGE from '../../../../app-graphql/src/mutations/submitHealthPlanPackage.graphql'
import {
    addLinkedRateToTestContract,
    addNewRateToTestContract,
    createSubmitAndUnlockTestRate,
    fetchTestRateById,
    formatRateDataForSending,
} from '../../testHelpers/gqlRateHelpers'
import {
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'

describe('submitRate', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })

    it('can submit rate without updates', async () => {
        const stateUser = testStateUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })

        const rate = await createSubmitAndUnlockTestRate(stateServer, cmsServer)

        const fetchDraftRate = await stateServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID: rate.id },
            },
        })

        const draftFormData =
            fetchDraftRate.data?.fetchRate.rate.draftRevision.formData

        // submitRate with no form data updates
        const result = await stateServer.executeOperation({
            query: SUBMIT_RATE,
            variables: {
                input: {
                    rateID: rate.id,
                },
            },
        })

        expect(result.errors).toBeUndefined()
        const submittedRate = result.data?.submitRate.rate
        const submittedRateFormData = submittedRate.revisions[0].formData

        // expect no errors from submit rate
        expect(result.errors).toBeUndefined()
        // expect rate data to be returned
        expect(submittedRate).toBeDefined()
        // expect status to be submitted.
        expect(submittedRate.status).toBe('RESUBMITTED')
        // expect formData to be the same
        expect(submittedRateFormData).toEqual(draftFormData)
    })
    it('can submit rate with formData updates', async () => {
        const stateUser = testStateUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })

        const rate = await createSubmitAndUnlockTestRate(stateServer, cmsServer)

        const fetchDraftRate = await stateServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID: rate.id },
            },
        })

        const draftFormData = rate.draftRevision?.formData

        // expect draft rate created in contract to exist
        expect(fetchDraftRate.errors).toBeUndefined()
        expect(draftFormData).toBeDefined()

        // update rate
        await updateTestRate(rate.id, {
            rateDateStart: new Date(Date.UTC(2025, 1, 1)),
        })

        const submittedRate = await submitTestRate(
            stateServer,
            rate.id,
            'Submit with edited rate description'
        )

        const submittedRateFormData = submittedRate.revisions[0].formData

        // expect rate data to be returned
        expect(submittedRate).toBeDefined()
        // expect status to be submitted.
        expect(submittedRate.status).toBe('RESUBMITTED')
        // expect formData to NOT be the same
        expect(submittedRateFormData.rateDateStart).not.toEqual(
            draftFormData?.rateDateStart
        )
    })
    it('can submit rate without formData updates', async () => {
        const stateUser = testStateUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })

        const draftRate = await createSubmitAndUnlockTestRate(
            stateServer,
            cmsServer
        )

        const fetchDraftRate = await stateServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID: draftRate.id },
            },
        })

        const draftFormData =
            fetchDraftRate.data?.fetchRate.rate.draftRevision.formData

        // expect draft rate created in contract to exist
        expect(fetchDraftRate.errors).toBeUndefined()
        expect(draftFormData).toBeDefined()

        const result = await stateServer.executeOperation({
            query: SUBMIT_RATE,
            variables: {
                input: {
                    rateID: draftRate.id,
                    submittedReason: 'submit rate',
                },
            },
        })
        const submittedRate = result.data?.submitRate.rate
        const submittedRateFormData = submittedRate.revisions[0].formData

        // expect no errors from submit rate
        expect(result.errors).toBeUndefined()
        // expect rate data to be returned
        expect(submittedRate).toBeDefined()
        // expect status to be submitted.
        expect(submittedRate.status).toBe('RESUBMITTED')
        // expect formData to be the same
        expect(submittedRateFormData).toEqual(draftFormData)
    })

    it('returns the latest linked contracts', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService,
            context: {
                user: testCMSUser(),
            },
        })

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        await addNewRateToTestContract(stateServer, draftA0, {
            rateDateStart: '2001-01-01',
        })

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID

        console.info('ONEID', OneID)

        // 2. Submit B0 with Rate2
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        await addNewRateToTestContract(stateServer, draftB0, {
            rateDateStart: '2003-01-01',
        })

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]
        const rate30 = subB0.rateRevisions[0]
        const TwoID = rate30.rateID
        console.info('THREEID', TwoID)

        expect(subB0.rateRevisions[0].rateID).toBe(TwoID)

        // 3. Submit C0 with Rate10 and Rate20
        const draftC0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftC020 = await addLinkedRateToTestContract(
            stateServer,
            draftC0,
            OneID
        )
        await addLinkedRateToTestContract(stateServer, draftC020, TwoID)

        const contractC0 = await submitTestContract(stateServer, draftC0.id)

        // 4. make sure both rates return contract C in their list of revisions
        const rateOne = await fetchTestRateById(stateServer, OneID)

        expect(rateOne.revisions).toHaveLength(1)
        expect(rateOne.revisions[0].contractRevisions).toHaveLength(2)

        const rateTwo = await fetchTestRateById(stateServer, TwoID)

        expect(rateTwo.revisions).toHaveLength(1)
        expect(rateTwo.revisions[0].contractRevisions).toHaveLength(2)

        // 5. unlock and resubmit A
        await unlockTestHealthPlanPackage(
            cmsServer,
            contractA0.id,
            'does this mess history'
        )

        const unlockedRateOne = await fetchTestRateById(stateServer, OneID)

        expect(unlockedRateOne.revisions).toHaveLength(1)
        expect(unlockedRateOne.revisions[0].contractRevisions).toHaveLength(2)

        await submitTestContract(
            stateServer,
            contractA0.id,
            'but what about this'
        )

        // everything should have the latest
        const resubmittedRateOne = await fetchTestRateById(stateServer, OneID)

        expect(resubmittedRateOne.revisions).toHaveLength(2)
        expect(resubmittedRateOne.revisions[0].contractRevisions).toHaveLength(
            2
        )

        const postResubmitRateTwo = await fetchTestRateById(stateServer, TwoID)

        expect(postResubmitRateTwo.revisions).toHaveLength(1)
        expect(postResubmitRateTwo.revisions[0].contractRevisions).toHaveLength(
            2
        )

        const postSubmitC = await fetchTestContract(stateServer, contractC0.id)

        expect(postSubmitC.packageSubmissions).toHaveLength(2)
    }, 10000)

    // TODO: this test needs to be updated to remove references to healthplanpackage
    it('can unlock and submit rate independent of contract status', async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
        })

        const draftContractWithRate =
            await createAndUpdateTestHealthPlanPackage(stateServer)
        const rateID = latestFormData(draftContractWithRate).rateInfos[0].id

        // submit contract and rate
        await stateServer.executeOperation({
            query: SUBMIT_HEALTH_PLAN_PACKAGE,
            variables: {
                input: {
                    pkgID: draftContractWithRate.id,
                },
            },
        })

        // fetch newly created rate
        const fetchDraftRate = await stateServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID },
            },
        })
        const draftRate = fetchDraftRate.data?.fetchRate.rate

        // expect rate to have been submitted with contract
        expect(draftRate.status).toBe('SUBMITTED')

        // unlocked the rate
        const unlockedRateResult = await cmsServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID,
                    unlockedReason: 'unlock rate',
                },
            },
        })
        const unlockedRate = unlockedRateResult.data?.unlockRate.rate

        // expect no errors from unlocking
        expect(unlockedRateResult.errors).toBeUndefined()
        // expect rate to be unlocked
        expect(unlockedRate.status).toBe('UNLOCKED')

        // resubmit rate
        const result = await stateServer.executeOperation({
            query: SUBMIT_RATE,
            variables: {
                input: {
                    rateID: rateID,
                    submittedReason: 'submit rate',
                    formData: formatRateDataForSending(
                        unlockedRate.draftRevision.formData
                    ),
                },
            },
        })
        const submittedRate = result.data?.submitRate.rate

        // expect no errors from submit rate
        expect(result.errors).toBeUndefined()
        // expect rate to be resubmitted
        expect(submittedRate.status).toBe('RESUBMITTED')
    })
    it('errors when feature flag is off', async () => {
        const stateUser = testStateUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService: testLDService({
                'rate-edit-unlock': false,
            }),
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })

        const draftRate = await createSubmitAndUnlockTestRate(
            stateServer,
            cmsServer
        )

        const fetchDraftRate = await stateServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID: draftRate.id },
            },
        })

        const draftFormData =
            fetchDraftRate.data?.fetchRate.rate.draftRevision.formData

        // expect draft rate created in contract to exist
        expect(fetchDraftRate.errors).toBeUndefined()
        expect(draftFormData).toBeDefined()

        // make update to formData and submit
        await updateTestRate(draftRate.id, {
            rateDateStart: new Date(Date.UTC(2025, 1, 1)),
        })

        const result = await stateServer.executeOperation({
            query: SUBMIT_RATE,
            variables: {
                input: {
                    rateID: draftRate.id,
                    submittedReason: 'submit rate',
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].extensions?.message).toBe(
            `Not authorized to edit and submit a rate independently, the feature is disabled`
        )
    })
})
