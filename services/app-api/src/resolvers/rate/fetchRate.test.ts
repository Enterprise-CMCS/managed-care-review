import FETCH_RATE from '../../../../app-graphql/src/queries/fetchRate.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    defaultFloridaRateProgram,
    resubmitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import {
    createAndSubmitTestRate,
    must,
    submitTestRate,
    unlockTestRate,
    updateTestRate,
} from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'

describe('fetchRate', () => {
    it('returns correct rate revisions on resubmit when existing rate is edited', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer()

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const initialRate = () => ({
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

        // First, submit and unlock a rate
        const submittedRate = await createAndSubmitTestRate(stateServer, {
            stateCode: 'FL',
            ...initialRate(),
        })
        await unlockTestRate(
            cmsServer,
            submittedRate.id,
            'Unlock to edit an existing rate'
        )

        // editrate with new data and resubmit
        await updateTestRate(submittedRate.id, {
            rateDateStart: new Date(Date.UTC(2025, 1, 1)),
            rateDateEnd: new Date(Date.UTC(2027, 1, 1)),
        })

        const resubmitted = await submitTestRate(
            stateServer,
            submittedRate.id,
            'Resubmit with edited rate description'
        )

        const resubmittedRate = resubmitted.data?.fetchRate.rate
        expect(resubmittedRate).toBeDefined()

        // check that we have two revisions of the same rate
        expect(resubmittedRate.revisions).toHaveLength(2)

        // newest revision data is correct
        expect(resubmittedRate.revisions[0].formData.rateDateStart).toBe(
            '2025-02-01'
        )
        expect(resubmittedRate.revisions[0].formData.rateDateEnd).toBe(
            '2027-02-01'
        )
        expect(resubmittedRate.revisions[0].submitInfo.updatedReason).toBe(
            'Resubmit with edited rate description'
        )
        // the initial submit data is correct
        expect(resubmittedRate.revisions[1].formData.rateDateStart).toBe(
            '2025-06-01'
        )
        expect(resubmittedRate.revisions[1].formData.rateDateEnd).toBe(
            '2026-05-30'
        )
        expect(resubmittedRate.revisions[1].submitInfo.updatedReason).toBe(
            'Initial submission'
        )
    })

    it('returns correct rate revisions on resubmit when new rate added', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer()

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

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

        // First, create new submission and unlock to edit rate
        const submittedInitial = await createAndSubmitTestHealthPlanPackage(
            server,
            {
                rateInfos: [initialRateInfos()],
            }
        )

        const existingRate = await unlockTestHealthPlanPackage(
            cmsServer,
            submittedInitial.id,
            'Unlock to edit add a new rate'
        )

        // add new rate
        const existingFormData = latestFormData(existingRate)
        const firstRateID = existingFormData.rateInfos[0].id
        expect(existingFormData.rateInfos).toHaveLength(1)
        await updateTestHealthPlanPackage(server, submittedInitial.id, {
            rateInfos: [
                existingFormData.rateInfos[0], // first rate unchanged
                {
                    ...initialRateInfos(),
                    rateDateStart: new Date(Date.UTC(2030, 1, 1)),
                    rateDateEnd: new Date(Date.UTC(2030, 12, 1)),
                    rateDateCertified: new Date(Date.UTC(2029, 10, 31)),
                },
            ],
        })

        const resubmitResult = await resubmitTestHealthPlanPackage(
            server,
            submittedInitial.id,
            'Resubmit with an additional rate'
        )

        // fetch and check rate 1 which was resubmitted with no changese
        expect(firstRateID).toBe(latestFormData(resubmitResult).rateInfos[0].id) // first rate ID should be unchanged

        const result1 = must(
            await cmsServer.executeOperation({
                query: FETCH_RATE,
                variables: {
                    input: { rateID: firstRateID },
                },
            })
        )
        const resubmittedRate1 = result1.data?.fetchRate.rate
        expect(resubmittedRate1.revisions).toHaveLength(2)
        // dates for first rate should be unchanged
        expect(resubmittedRate1.revisions[0].formData.rateDateStart).toBe(
            '2025-06-01'
        )
        expect(resubmittedRate1.revisions[0].formData.rateDateEnd).toBe(
            '2026-05-30'
        )
        expect(resubmittedRate1.revisions[0].submitInfo.updatedReason).toBe(
            'Resubmit with an additional rate'
        )

        // check that initial submission is correct
        expect(resubmittedRate1.revisions[1].formData.rateDateStart).toBe(
            '2025-06-01'
        )
        expect(resubmittedRate1.revisions[1].formData.rateDateEnd).toBe(
            '2026-05-30'
        )
        expect(resubmittedRate1.revisions[1].submitInfo.updatedReason).toBe(
            'Initial submission'
        )

        // Check our second test rate which was added in unlock
        const secondRateID = latestFormData(resubmitResult).rateInfos[1].id
        const result2 = await cmsServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID: secondRateID },
            },
        })

        const resubmitted2 = result2.data?.fetchRate.rate
        expect(result2.errors).toBeUndefined()
        expect(resubmitted2).toBeDefined()

        // second test rate should only have one revision with the correct data
        expect(resubmitted2.revisions).toHaveLength(1)
        expect(resubmitted2.revisions[0].submitInfo.updatedReason).toBe(
            'Resubmit with an additional rate'
        )
        expect(resubmitted2.revisions[0].formData.rateDateStart).toBe(
            '2030-02-01'
        )
        expect(resubmitted2.revisions[0].formData.rateDateEnd).toBe(
            '2031-01-01'
        )
        expect(resubmitted2.revisions[0].formData.rateDateCertified).toBe(
            '2029-12-01'
        )
    })

    it('returns the right revisions as a rate is unlocked', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer()

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const unlockedSubmission =
            await createAndSubmitTestHealthPlanPackage(server)

        // unlock two
        await unlockTestHealthPlanPackage(
            cmsServer,
            unlockedSubmission.id,
            'Test reason'
        )

        const unlockedRateID =
            latestFormData(unlockedSubmission).rateInfos[0].id

        const input = {
            rateID: unlockedRateID,
        }

        // fetch rate
        const result = await cmsServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input,
            },
        })

        const unlockedRate = result.data?.fetchRate.rate
        expect(result.errors).toBeUndefined()
        expect(unlockedRate).toBeDefined()

        expect(unlockedRate.draftRevision).toBeDefined()
        expect(unlockedRate.draftRevision?.submitInfo).toBeNull()
        expect(unlockedRate.draftRevision?.unlockInfo).toBeTruthy()

        expect(unlockedRate.revisions).toHaveLength(1)
        expect(unlockedRate.revisions[0].submitInfo).toBeTruthy()
        expect(unlockedRate.revisions[0].unlockInfo).toBeNull()
    })
})
