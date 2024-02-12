import FETCH_RATE from '../../../../app-graphql/src/queries/fetchRate.graphql'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaRateProgram,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestRate,
    must,
    submitTestRate,
    unlockTestRate,
    updateTestRate,
} from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'

describe('fetchRate', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    it('returns correct rate revisions on resubmit when existing rate is edited', async () => {
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            ldService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
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

        const resubmittedRate = await submitTestRate(
            stateServer,
            submittedRate.id,
            'Resubmit with edited rate description'
        )
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
        expect(resubmittedRate.revisions[0].submitInfo?.updatedReason).toBe(
            'Resubmit with edited rate description'
        )
        // the initial submit data is correct
        expect(resubmittedRate.revisions[1].formData.rateDateStart).toBe(
            '2025-06-01'
        )
        expect(resubmittedRate.revisions[1].formData.rateDateEnd).toBe(
            '2026-05-30'
        )
        expect(resubmittedRate.revisions[1].submitInfo?.updatedReason).toBe(
            'Initial submission'
        )
    })

    it('returns correct rate revisions on resubmit when new rate added', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({ ldService })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
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

        // First, create new rate and unlock to edit it
        const submittedInitial = await createAndSubmitTestRate(server, {
            stateCode: 'MS',
            rateDateStart: new Date(Date.UTC(2030, 1, 1)),
            rateDateEnd: new Date(Date.UTC(2031, 1, 1)),
        })

        const existingRate = await unlockTestRate(
            cmsServer,
            submittedInitial.id,
            'Unlock to edit add a new rate'
        )

        // add new rate
        const firstRateID = existingRate.id
        expect(existingRate.revisions).toHaveLength(1)
        const updatedRate = await updateTestRate(submittedInitial.id, {
            ...initialRateInfos(),
            rateDateStart: new Date(Date.UTC(2034, 1, 1)),
            rateDateEnd: new Date(Date.UTC(2035, 1, 1)),
            rateDateCertified: new Date(Date.UTC(2029, 10, 31)),
        })

        const resubmittedRate = await submitTestRate(
            server,
            updatedRate.id,
            'Resubmit with an additional rate'
        )

        // fetch and check rate 1 which was resubmitted with no changese
        expect(firstRateID).toBe(resubmittedRate.id) // first rate ID should be unchanged

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
            '2034-02-01'
        )
        expect(resubmittedRate1.revisions[0].formData.rateDateEnd).toBe(
            '2035-02-01'
        )
        expect(resubmittedRate1.revisions[0].submitInfo.updatedReason).toBe(
            'Resubmit with an additional rate'
        )

        // check that initial rate is correct
        expect(resubmittedRate1.revisions[1].formData.rateDateStart).toBe(
            '2030-02-01'
        )
        expect(resubmittedRate1.revisions[1].formData.rateDateEnd).toBe(
            '2031-02-01'
        )
        expect(resubmittedRate1.revisions[1].submitInfo.updatedReason).toBe(
            'Initial submission'
        )
    })

    it('returns the right revisions as a rate is unlocked', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({ ldService })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
        })

        const submittedRate = await createAndSubmitTestRate(server)

        const unlockRate = await unlockTestRate(
            cmsServer,
            submittedRate.id,
            'Unlock to edit a rate'
        )

        const input = {
            rateID: unlockRate.id,
        }

        // fetch rate
        const result = must(
            await cmsServer.executeOperation({
                query: FETCH_RATE,
                variables: {
                    input,
                },
            })
        )

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
