import FETCH_RATE from '../../../../app-graphql/src/queries/fetchRate.graphql'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaRateProgram,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanFormData,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { submitTestRate, updateTestRate } from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'
import {
    addNewRateToTestContract,
    createSubmitAndUnlockTestRate,
    fetchTestRateById,
    updateRatesInputFromDraftContract,
    updateTestDraftRatesOnContract,
} from '../../testHelpers/gqlRateHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import dayjs from 'dayjs'

describe('fetchRate', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    it('returns correct revisions on resubmit when existing rate is edited', async () => {
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

        const submittedRate = await createSubmitAndUnlockTestRate(
            stateServer,
            cmsServer
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
            '2024-01-01'
        )
        expect(resubmittedRate.revisions[1].formData.rateDateEnd).toBe(
            '2025-01-01'
        )
        expect(resubmittedRate.revisions[1].submitInfo?.updatedReason).toBe(
            'Initial submission'
        )
    })

    it('returns correct revisions on resubmit when new rate added', async () => {
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
        const submittedInitial = await createSubmitAndUnlockTestRate(
            server,
            cmsServer
        )

        // add new rate
        const firstRateID = submittedInitial.id
        expect(submittedInitial.revisions).toHaveLength(1)
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

        // fetch and check rate 1 which was resubmitted with no changes
        expect(firstRateID).toBe(resubmittedRate.id) // first rate ID should be unchanged

        const result1 = await cmsServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input: { rateID: firstRateID },
            },
        })

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
            '2024-01-01'
        )
        expect(resubmittedRate1.revisions[1].formData.rateDateEnd).toBe(
            '2025-01-01'
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

        const submittedRate = await createSubmitAndUnlockTestRate(
            server,
            cmsServer
        )

        const input = {
            rateID: submittedRate.id,
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

    it('returns the correct dateAdded for documents', async () => {
        const ldService = testLDService({
            'link-rates': true,
        })
        const prismaClient = await sharedTestPrismaClient()
        const stateServer = await constructTestPostgresServer({
            ldService,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService,
            context: {
                user: testCMSUser(),
            },
        })

        const dummyDoc = (postfix: string) => {
            return {
                name: `doc${postfix}.pdf`,
                s3URL: `fakeS3URL${postfix}`,
                sha256: `fakesha${postfix}`,
            }
        }

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 = await createAndUpdateTestContractWithoutRates(
            stateServer,
            'FL',
            {
                contractDocuments: [dummyDoc('c1')],
                documents: [dummyDoc('s1')],
            }
        )
        const AID = draftA0.id
        await addNewRateToTestContract(stateServer, draftA0, {
            rateDateStart: '2001-01-01',
            rateDocuments: [dummyDoc('r1')],
            supportingDocuments: [dummyDoc('x1')],
        })

        const contractA0 = await submitTestContract(stateServer, AID)
        const subA0 = contractA0.packageSubmissions[0]
        const rate10 = subA0.rateRevisions[0]
        const OneID = rate10.rateID

        // CHANGE SUBMISSION DATE
        await prismaClient.contractRevisionTable.update({
            where: {
                id: subA0.contractRevision.id,
            },
            data: {
                submitInfo: {
                    update: {
                        updatedAt: new Date('2024-01-01'),
                    },
                },
            },
        })

        const fixSubmitA0 = await fetchTestRateById(stateServer, OneID)
        const rateRev = fixSubmitA0.revisions[0]
        if (
            !rateRev.formData.rateDocuments ||
            !rateRev.formData.rateDocuments[0]
        )
            throw new Error('something')
        if (
            !rateRev.formData.supportingDocuments ||
            !rateRev.formData.supportingDocuments[0]
        )
            throw new Error('something')
        expect(rateRev.formData.rateDocuments).toHaveLength(1)
        expect(rateRev.formData.rateDocuments[0].name).toBe('docr1.pdf')
        expect(
            dayjs
                .tz(rateRev.formData.rateDocuments[0].dateAdded, 'UTC')
                .format('YYYY-MM-DD')
        ).toBe('2024-01-01')

        expect(rateRev.formData.supportingDocuments).toHaveLength(1)
        expect(rateRev.formData.supportingDocuments[0].name).toBe('docx1.pdf')
        expect(
            dayjs
                .tz(rateRev.formData.supportingDocuments[0].dateAdded, 'UTC')
                .format('YYYY-MM-DD')
        ).toBe('2024-01-01')

        // 2. Unlock and add more documents
        const unlockedA0Pkg = await unlockTestHealthPlanPackage(
            cmsServer,
            AID,
            'Unlock A.0'
        )
        const a0FormData = latestFormData(unlockedA0Pkg)
        const unlockedA0Contract = await fetchTestContract(stateServer, AID)
        a0FormData.submissionDescription = 'DESC A1'
        a0FormData.contractDocuments.push(dummyDoc('c2'))
        a0FormData.documents.push(dummyDoc('s2'))

        await updateTestHealthPlanFormData(stateServer, a0FormData)
        const a0RatesUpdates =
            updateRatesInputFromDraftContract(unlockedA0Contract)
        expect(a0RatesUpdates.updatedRates[0].rateID).toBe(OneID)
        a0RatesUpdates.updatedRates[0].formData?.rateDocuments.push(
            dummyDoc('r2')
        )
        a0RatesUpdates.updatedRates[0].formData?.supportingDocuments.push(
            dummyDoc('x2')
        )

        await updateTestDraftRatesOnContract(stateServer, a0RatesUpdates)

        const submittedA1 = await submitTestContract(
            stateServer,
            AID,
            'Submit A.1'
        )
        const a1sub = submittedA1.packageSubmissions[0]

        // CHANGE SUBMISSION DATE
        await prismaClient.contractRevisionTable.update({
            where: {
                id: a1sub.contractRevision.id,
            },
            data: {
                submitInfo: {
                    update: {
                        updatedAt: new Date('2024-02-02'),
                    },
                },
            },
        })

        const rateA1 = await fetchTestRateById(stateServer, OneID)

        const rateRevA1 = rateA1.revisions[0]
        if (
            !rateRevA1.formData.rateDocuments ||
            !rateRev.formData.rateDocuments[0]
        )
            throw new Error('something')
        if (
            !rateRevA1.formData.supportingDocuments ||
            !rateRev.formData.supportingDocuments[0]
        )
            throw new Error('something')
        expect(rateRevA1.formData.rateDocuments).toHaveLength(2)
        expect(rateRevA1.formData.rateDocuments[0].name).toBe('docr1.pdf')
        expect(
            dayjs
                .tz(rateRevA1.formData.rateDocuments[0].dateAdded, 'UTC')
                .format('YYYY-MM-DD')
        ).toBe('2024-01-01')

        expect(rateRevA1.formData.rateDocuments[1].name).toBe('docr2.pdf')
        expect(
            dayjs
                .tz(rateRevA1.formData.rateDocuments[1].dateAdded, 'UTC')
                .format('YYYY-MM-DD')
        ).toBe('2024-02-02')

        expect(rateRevA1.formData.supportingDocuments).toHaveLength(2)
        expect(rateRevA1.formData.supportingDocuments[0].name).toBe('docx1.pdf')
        expect(
            dayjs
                .tz(rateRevA1.formData.supportingDocuments[0].dateAdded, 'UTC')
                .format('YYYY-MM-DD')
        ).toBe('2024-01-01')

        expect(rateRevA1.formData.supportingDocuments[1].name).toBe('docx2.pdf')
        expect(
            dayjs
                .tz(rateRevA1.formData.supportingDocuments[1].dateAdded, 'UTC')
                .format('YYYY-MM-DD')
        ).toBe('2024-02-02')
    })
})
