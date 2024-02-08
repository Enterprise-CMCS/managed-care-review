import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import SUBMIT_RATE from '../../../../app-graphql/src/mutations/submitRate.graphql'
import FETCH_RATE from 'app-graphql/src/queries/fetchRate.graphql'
import SUBMIT_HEALTH_PLAN_PACKAGE from '../../../../app-graphql/src/mutations/submitHealthPlanPackage.graphql'
import UNLOCK_RATE from '../../../../app-graphql/src/mutations/unlockRate.graphql'
import { createTestRate, submitTestRate, mockDraftRate, must, updateTestRate } from '../../testHelpers'

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
        // submitRate with no form data updates
        const result = await stateServer.executeOperation({
            query: SUBMIT_RATE,
            variables: {
                input: {
                    rateID: draftRate.id,
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
        expect(submittedRate.status).toBe('SUBMITTED')
        // expect formData to be the same
        expect(submittedRateFormData).toEqual(draftRate.draftRevision?.formData)
    })
    // it('can submit rate with formData updates', async () => {
    //     const stateUser = testStateUser()

    //     const stateServer = await constructTestPostgresServer({
    //         context: {
    //             user: stateUser,
    //         },
    //         ldService,
    //     })

    //     // createRate with full data
    //     const draftRate = await createTestRate()
    //     expect(draftRate).toBe(
    //         '2025-01-01'
    //     )
    //     const submittedRate = await submitTestRate(
    //         stateServer,
    //         draftRate.id,
    //         'Resubmit with edited rate description'
    //     )

    //     const result = await stateServer.executeOperation({
    //         query: SUBMIT_RATE,
    //         variables: {
    //             input: {
    //                 rateID: draftRate.id,
    //             },
    //         },
    //     })
   
    //     // expect rate data to be returned
    //     expect(submittedRate).toBeDefined()
    //     // expect status to be submitted.
    //     expect(submittedRate.status).toBe('SUBMITTED')
    //     // expect formData to NOT be the same
    //      // newest revision data is correct
    //      expect(submittedRate.revisions[0].formData.rateDateStart).toBe(
    //         '2025-01-01'
    //     )
    // })
    it('can submit rate without formData updates', async () => {
        const stateUser = testStateUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
        })

        const draftContractWithRate =
            await createAndUpdateTestHealthPlanPackage(stateServer)

        const rateID = latestFormData(draftContractWithRate).rateInfos[0].id

        const fetchDraftRate = await stateServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID },
            },
        })

        const draftFormData =
            fetchDraftRate.data?.fetchRate.rate.draftRevision.formData

        // expect draft rate created in contract to exist
        expect(fetchDraftRate.errors).toBeUndefined()
        expect(draftFormData).toBeDefined()

        // make update to formData in submit
        const result = await stateServer.executeOperation({
            query: SUBMIT_RATE,
            variables: {
                input: {
                    rateID: rateID,
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

        const draftContractWithRate =
            await createAndUpdateTestHealthPlanPackage(stateServer)

        const rateID = latestFormData(draftContractWithRate).rateInfos[0].id

        const fetchDraftRate = await stateServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID },
            },
        })

        const draftFormData =
            fetchDraftRate.data?.fetchRate.rate.draftRevision.formData

        // expect draft rate created in contract to exist
        expect(fetchDraftRate.errors).toBeUndefined()
        expect(draftFormData).toBeDefined()

        // make update to formData in submit
        const result = await stateServer.executeOperation({
            query: SUBMIT_RATE,
            variables: {
                input: {
                    rateID: rateID,
                    submittedReason: 'submit rate',
                    formData: {
                        ...draftFormData,
                        rateType: 'AMENDMENT',
                    },
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].extensions?.message).toBe(
            `Not authorized to edit and submit a rate independently, the feature is disabled`
        )
    })
})
