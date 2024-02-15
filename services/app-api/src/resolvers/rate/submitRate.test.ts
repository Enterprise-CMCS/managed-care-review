import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { testStateUser, testCMSUser } from '../../testHelpers/userHelpers'
import SUBMIT_RATE from '../../../../app-graphql/src/mutations/submitRate.graphql'
import FETCH_RATE from '../../../../app-graphql/src/queries/fetchRate.graphql'
import UNLOCK_RATE from '../../../../app-graphql/src/mutations/unlockRate.graphql'
import {
    createTestRate,
    submitTestRate,
    must,
    updateTestRate,
} from '../../testHelpers'
import SUBMIT_HEALTH_PLAN_PACKAGE from '../../../../app-graphql/src/mutations/submitHealthPlanPackage.graphql'

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

        // createRate with full data
        const draftRate = await createTestRate()
        const fetchDraftRate = must(
            await stateServer.executeOperation({
                query: FETCH_RATE,
                variables: {
                    input: { rateID: draftRate.id },
                },
            })
        )

        const draftFormData =
            fetchDraftRate.data?.fetchRate.rate.draftRevision.formData

        // submitRate with no form data updates
        const result = must(
            await stateServer.executeOperation({
                query: SUBMIT_RATE,
                variables: {
                    input: {
                        rateID: draftRate.id,
                    },
                },
            })
        )
        expect(result.errors).toBeUndefined()
        const submittedRate = result.data?.submitRate.rate
        const submittedRateFormData = submittedRate.revisions[0].formData

        // expect no errors from submit rate
        expect(result.errors).toBeUndefined()
        // expect rate data to be returned
        expect(submittedRate).toBeDefined()
        // expect status to be submitted.
        expect(submittedRate.status).toBe('SUBMITTED')
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

        const draftRate = await createTestRate()

        const fetchDraftRate = must(
            await stateServer.executeOperation({
                query: FETCH_RATE,
                variables: {
                    input: { rateID: draftRate.id },
                },
            })
        )

        const draftFormData = draftRate.draftRevision?.formData

        // expect draft rate created in contract to exist
        expect(fetchDraftRate.errors).toBeUndefined()
        expect(draftFormData).toBeDefined()

        // update rate
        await updateTestRate(draftRate.id, {
            rateDateStart: new Date(Date.UTC(2025, 1, 1)),
        })

        const submittedRate = await submitTestRate(
            stateServer,
            draftRate.id,
            'Submit with edited rate description'
        )

        const submittedRateFormData = submittedRate.revisions[0].formData

        // expect rate data to be returned
        expect(submittedRate).toBeDefined()
        // expect status to be submitted.
        expect(submittedRate.status).toBe('SUBMITTED')
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

        const draftRate = await createTestRate()

        const fetchDraftRate = must(
            await stateServer.executeOperation({
                query: FETCH_RATE,
                variables: {
                    input: { rateID: draftRate.id },
                },
            })
        )

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
        expect(submittedRate.status).toBe('SUBMITTED')
        // expect formData to be the same
        expect(submittedRateFormData).toEqual(draftFormData)
    })
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
                    submitReason: 'submit rate',
                    formData: unlockedRate.draftRevision.formData,
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

        const draftRate = await createTestRate()

        const fetchDraftRate = must(
            await stateServer.executeOperation({
                query: FETCH_RATE,
                variables: {
                    input: { rateID: draftRate.id },
                },
            })
        )

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
