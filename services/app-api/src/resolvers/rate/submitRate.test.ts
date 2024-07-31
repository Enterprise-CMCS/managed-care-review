import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { v4 as uuidv4 } from 'uuid'
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
import {
    clearMetadataFromRateFormData,
    submitTestRate,
    updateTestRate,
} from '../../testHelpers'
import SUBMIT_HEALTH_PLAN_PACKAGE from '../../../../app-graphql/src/mutations/submitHealthPlanPackage.graphql'
import {
    addLinkedRateToTestContract,
    addNewRateToTestContract,
    createSubmitAndUnlockTestRate,
    fetchTestRateById,
    formatRateDataForSending,
    unlockTestRate,
} from '../../testHelpers/gqlRateHelpers'
import {
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-web/src/testHelpers/s3Helpers'
import { submitRate } from '../../postgres/contractAndRates'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('submitRate', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    it('can submit rate without updates', async () => {
        const stateUser = testStateUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
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

        expect(submittedRateFormData.rateCapitationType).toEqual(
            draftFormData.rateCapitationType
        )
        expect(submittedRateFormData.rateDateStart).toEqual(
            draftFormData.rateDateStart
        )
        expect(submittedRateFormData.rateDateEnd).toEqual(
            draftFormData.rateDateEnd
        )
        expect(submittedRateFormData.rateDateCertified).toEqual(
            draftFormData.rateDateCertified
        )
        expect(submittedRateFormData.amendmentEffectiveDateStart).toEqual(
            draftFormData.amendmentEffectiveDateStart
        )
        expect(submittedRateFormData.amendmentEffectiveDateEnd).toEqual(
            draftFormData.amendmentEffectiveDateEnd
        )
        expect(submittedRateFormData.deprecatedRateProgramIDs).toEqual(
            draftFormData.deprecatedRateProgramIDs
        )
        expect(submittedRateFormData.rateProgramIDs).toEqual(
            draftFormData.rateProgramIDs
        )
        expect(submittedRateFormData.rateCertificationName).toEqual(
            draftFormData.rateCertificationName
        )
        expect(submittedRateFormData.certifyingActuaryContacts).toEqual(
            draftFormData.certifyingActuaryContacts
        )
        expect(submittedRateFormData.addtlActuaryContacts).toEqual(
            draftFormData.addtlActuaryContacts
        )
        expect(submittedRateFormData.actuaryCommunicationPreference).toEqual(
            draftFormData.actuaryCommunicationPreference
        )
        expect(submittedRateFormData.packagesWithSharedRateCerts).toEqual(
            draftFormData.packagesWithSharedRateCerts
        )
        expect(clearMetadataFromRateFormData(submittedRateFormData)).toEqual(
            clearMetadataFromRateFormData(draftFormData)
        )
    })
    it('can submit rate with formData updates', async () => {
        const stateUser = testStateUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
            ldService,
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
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
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
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

        expect(clearMetadataFromRateFormData(submittedRateFormData)).toEqual(
            clearMetadataFromRateFormData(draftFormData)
        )
    })

    it('returns the latest linked contracts', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService,
            context: {
                user: testCMSUser(),
            },
            s3Client: mockS3,
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
        console.info('TWOID', TwoID)

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

        expect(rateOne.packageSubmissions).toHaveLength(2)
        expect(rateOne.packageSubmissions?.[0].contractRevisions).toHaveLength(
            2
        )
        expect(rateOne.packageSubmissions?.[1].contractRevisions).toHaveLength(
            1
        )

        const rateTwo = await fetchTestRateById(stateServer, TwoID)

        expect(rateTwo.packageSubmissions).toHaveLength(2)
        expect(rateTwo.packageSubmissions?.[0].contractRevisions).toHaveLength(
            2
        )
        expect(rateTwo.packageSubmissions?.[1].contractRevisions).toHaveLength(
            1
        )

        // 5. unlock and resubmit A
        await unlockTestHealthPlanPackage(
            cmsServer,
            contractA0.id,
            'does this mess history'
        )

        const unlockedRateOne = await fetchTestRateById(stateServer, OneID)

        expect(unlockedRateOne.packageSubmissions).toHaveLength(2)
        expect(
            unlockedRateOne.packageSubmissions?.[0].contractRevisions
        ).toHaveLength(2)
        expect(
            unlockedRateOne.packageSubmissions?.[1].contractRevisions
        ).toHaveLength(1)

        await submitTestContract(
            stateServer,
            contractA0.id,
            'but what about this'
        )

        // everything should have the latest
        const resubmittedRateOne = await fetchTestRateById(stateServer, OneID)

        expect(resubmittedRateOne.packageSubmissions).toHaveLength(3)
        expect(
            resubmittedRateOne.packageSubmissions?.[0].contractRevisions
        ).toHaveLength(2)

        const postResubmitRateTwo = await fetchTestRateById(stateServer, TwoID)

        expect(postResubmitRateTwo.packageSubmissions).toHaveLength(2)
        expect(
            postResubmitRateTwo.packageSubmissions?.[0].contractRevisions
        ).toHaveLength(2)

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
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
            s3Client: mockS3,
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
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
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

    it('is a rate that returns packageSubmissions', async () => {
        const client = await sharedTestPrismaClient()

        const stateUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Aang',
                familyName: 'Avatar',
                email: 'aang@example.com',
                role: 'STATE_USER',
                stateCode: 'NM',
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const AID = draftA0.id
        const draftA010 = await addNewRateToTestContract(stateServer, draftA0)

        await addNewRateToTestContract(stateServer, draftA010)

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID

        // 2. Submit B0 with Rate1 and Rate3
        const draftB0 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const draftB010 = await addLinkedRateToTestContract(
            stateServer,
            draftB0,
            OneID
        )
        await addNewRateToTestContract(stateServer, draftB010)

        const contractB0 = await submitTestContract(stateServer, draftB0.id)
        const subB0 = contractB0.packageSubmissions[0]
        expect(subB0.rateRevisions[0].rateID).toBe(OneID)

        await unlockTestRate(cmsServer, OneID, 'unlock rate')

        await updateTestRate(OneID, {
            rateCertificationName: 'after update',
        })

        const res = await submitRate(client, {
            rateID: OneID,
            submittedByUserID: stateUser.id,
            submittedReason: 'final submit',
        })
        if (res instanceof Error) {
            throw res
        }

        const fetchedRate = await fetchTestRateById(stateServer, OneID)

        const subs = fetchedRate.packageSubmissions
        if (!subs) {
            throw new Error('no subs')
        }
        expect(subs).toHaveLength(3)

        expect(subs[0].submitInfo.updatedReason).toBe('final submit')
        expect(subs[0].cause).toBe('RATE_SUBMISSION')
        expect(subs[0].submittedRevisions.map((r) => r.id)).toContain(
            subs[0].rateRevision.id
        )

        expect(subs[1].submitInfo.updatedReason).toBe('Initial submission')
        expect(subs[1].cause).toBe('RATE_LINK')
        expect(subs[1].submittedRevisions.map((r) => r.id)).not.toContain(
            subs[1].rateRevision.id
        )

        expect(subs[2].submitInfo.updatedReason).toBe('Initial submission')
        expect(subs[2].cause).toBe('RATE_SUBMISSION')
        expect(subs[2].submittedRevisions.map((r) => r.id)).toContain(
            subs[2].rateRevision.id
        )
    })
})
