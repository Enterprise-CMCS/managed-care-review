import {
    FetchRateDocument,
    FetchRateWithQuestionsDocument,
} from '../../gen/gqlClient'
import type { RateFormDataInput } from '../../gen/gqlClient'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import {
    constructTestPostgresServer,
    createTestRateQuestion,
    defaultFloridaRateProgram,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    createDBUsersWithFullData,
    testCMSApproverUser,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { submitTestRate, updateTestRate } from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'
import {
    addNewRateToTestContract,
    createSubmitAndUnlockTestRate,
    fetchTestRateById,
    updateRatesInputFromDraftContract,
    updateTestDraftRateOnContract,
    updateTestDraftRatesOnContract,
} from '../../testHelpers/gqlRateHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    fetchTestContract,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-api/src/testHelpers/s3Helpers'
import { dayjs } from '@mc-review/dates'

describe('fetchRate', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    it('returns correct revisions on resubmit when existing rate is edited', async () => {
        const cmsUser = testCMSUser()
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

        const initialRateInfos = () => ({
            id: uuidv4(),
            rateType: 'NEW' as const,
            rateDateStart: new Date(Date.UTC(2025, 5, 1)),
            rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
            rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
            rateDocuments: [
                {
                    name: 'rateDocument.pdf',
                    s3URL: 's3://bucketname/key/test1',
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

        const result1 = await executeGraphQLOperation(cmsServer, {
            query: FetchRateDocument,
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

    it('returns correct consolidated rateProgramIDs', async () => {
        const dbClient = await sharedTestPrismaClient()
        const cmsUser = testCMSUser()
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

        // First, create new rate
        const submittedInitial =
            await createAndSubmitTestContractWithRate(server)

        const rrev = submittedInitial.packageSubmissions[0].rateRevisions[0]
        const rateID = rrev.rateID
        const fakeProgramIDs = [uuidv4(), uuidv4()]

        // manually change it to have deprecated rate program IDs in the db since we can't
        // submit something that has them now.
        await dbClient.rateRevisionTable.update({
            where: {
                id: rrev.id,
            },
            data: {
                rateProgramIDs: [],
                deprecatedRateProgramIDs: fakeProgramIDs,
            },
        })

        const fetchedDeprecated = await fetchTestRateById(cmsServer, rateID)
        const fetchedRev = fetchedDeprecated.packageSubmissions![0].rateRevision

        expect(fetchedRev.formData.rateProgramIDs).toHaveLength(0)
        expect(fetchedRev.formData.deprecatedRateProgramIDs).toStrictEqual(
            fakeProgramIDs
        )
        expect(fetchedRev.formData.consolidatedRateProgramIDs).toStrictEqual(
            fakeProgramIDs
        )

        // unlock and set non-deprecated IDs
        const unlocked = await unlockTestContract(
            cmsServer,
            submittedInitial.id,
            'unlock to fix deprecated IDs'
        )

        const realRateProgramIDs = [defaultFloridaRateProgram().id]

        const updatedRateInfo: RateFormDataInput = {
            rateType: 'NEW' as const,
            rateDateStart: '2025-05-01',
            rateDateEnd: '2026-04-30',
            rateDateCertified: '2025-03-15',
            rateCapitationType: 'RATE_CELL',
            rateDocuments: [
                {
                    name: 'rateDocument.pdf',
                    s3URL: 's3://bucketname/key/test1',
                    sha256: 'fakesha',
                },
            ],
            supportingDocuments: [],
            rateProgramIDs: realRateProgramIDs,
            deprecatedRateProgramIDs: [],
            certifyingActuaryContacts: [
                {
                    name: 'test name',
                    titleRole: 'test title',
                    email: 'email@example.com',
                    actuarialFirm: 'MERCER' as const,
                    actuarialFirmOther: '',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY' as const,
        }

        await updateTestDraftRateOnContract(
            server,
            submittedInitial.id,
            unlocked.draftRevision?.updatedAt,
            rateID,
            updatedRateInfo
        )
        await submitTestContract(
            server,
            submittedInitial.id,
            'resubmit with new rateIDs'
        )

        const fetchedResolved = await fetchTestRateById(cmsServer, rateID)
        const fetchedResolvedRev =
            fetchedResolved.packageSubmissions![0].rateRevision

        expect(
            fetchedResolvedRev.formData.deprecatedRateProgramIDs
        ).toHaveLength(0)
        expect(fetchedResolvedRev.formData.rateProgramIDs).toStrictEqual(
            realRateProgramIDs
        )
        expect(
            fetchedResolvedRev.formData.consolidatedRateProgramIDs
        ).toStrictEqual(realRateProgramIDs)
    })

    it('returns webURL', async () => {
        const server = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })

        // First, create new rate
        const submittedInitial =
            await createAndSubmitTestContractWithRate(server)

        const rrev = submittedInitial.packageSubmissions[0].rateRevisions[0]
        const fetchedRate = await fetchTestRateById(server, rrev.rateID)

        expect(fetchedRate.webURL).toBe(
            `https://localhost:3000/rates/${rrev.rateID}`
        )
    })

    it('returns the right revisions as a rate is unlocked', async () => {
        const cmsUser = testCMSUser()
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

        const submittedRate = await createSubmitAndUnlockTestRate(
            server,
            cmsServer
        )

        const input = {
            rateID: submittedRate.id,
        }

        // fetch rate
        const result = await executeGraphQLOperation(cmsServer, {
            query: FetchRateDocument,
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

    it('returns the downloadURL on a fetchedRate', async () => {
        const cmsUser = testCMSUser()
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

        const submittedRate = await createSubmitAndUnlockTestRate(
            server,
            cmsServer
        )
        expect(submittedRate).toBeDefined()

        const input = {
            rateID: submittedRate.id,
        }

        // fetch rate
        const result = await executeGraphQLOperation(cmsServer, {
            query: FetchRateDocument,
            variables: {
                input,
            },
        })

        const unlockedRate = result.data?.fetchRate.rate
        expect(result.errors).toBeUndefined()
        expect(unlockedRate).toBeDefined()

        expect(
            unlockedRate.draftRevision.formData.rateDocuments[0].downloadURL
        ).toBeDefined()
        expect(
            unlockedRate.draftRevision.formData.supportingDocuments[0]
                .downloadURL
        ).toBeDefined()
    })

    it('returns the correct dateAdded for documents', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            ldService,
            context: {
                user: testCMSUser(),
            },
            s3Client: mockS3,
        })

        const dummyDoc = (postfix: string) => {
            return {
                name: `doc${postfix}.pdf`,
                s3URL: `s3://bucketname/key/test1${postfix}`,
                sha256: `fakesha${postfix}`,
            }
        }

        // 1. Submit A0 with Rate1 and Rate2
        const draftA0 = await createAndUpdateTestContractWithoutRates(
            stateServer,
            'FL',
            {
                contractDocuments: [dummyDoc('c1')],
                supportingDocuments: [dummyDoc('s1')],
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

        // Change rate submission date and document dateAdded
        await prismaClient.rateRevisionTable.update({
            where: {
                id: rate10.id,
            },
            data: {
                submitInfo: {
                    update: {
                        updatedAt: new Date('2024-01-01'),
                    },
                },
                rateDocuments: {
                    updateMany: rate10.formData.rateDocuments.map((doc) => ({
                        where: {
                            id: doc.id!,
                        },
                        data: {
                            dateAdded: new Date('2024-01-01'),
                        },
                    })),
                },
                supportingDocuments: {
                    updateMany: rate10.formData.supportingDocuments.map(
                        (doc) => ({
                            where: {
                                id: doc.id!,
                            },
                            data: {
                                dateAdded: new Date('2024-01-01'),
                            },
                        })
                    ),
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
        const unlockedA0 = await unlockTestContract(
            cmsServer,
            AID,
            'Unlock A.0'
        )
        const a0FormData = unlockedA0.draftRevision?.formData
        a0FormData.submissionDescription = 'DESC A1'
        a0FormData.contractDocuments.push(dummyDoc('c2'))
        a0FormData.contractDocuments.push(dummyDoc('s2'))

        const unlockedA0Contract = await fetchTestContract(stateServer, AID)
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
        const rateUpdated = a1sub.rateRevisions[0]
        const dummyRateDocR2 = rateUpdated.formData.rateDocuments.find(
            (doc) => doc.name === 'docr2.pdf'
        )
        const dummyRateDocS2 = rateUpdated.formData.supportingDocuments.find(
            (doc) => doc.name === 'docx2.pdf'
        )

        if (!dummyRateDocR2 || !dummyRateDocS2) {
            throw new Error(
                'Unexpected error: Additional docs where not found in submission'
            )
        }

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

        // Change rate submission date and document added for new docs only
        await prismaClient.rateRevisionTable.update({
            where: {
                id: rateUpdated.id,
            },
            data: {
                submitInfo: {
                    update: {
                        updatedAt: new Date('2024-02-02'),
                    },
                },
                rateDocuments: {
                    update: {
                        where: {
                            id: dummyRateDocR2.id!,
                        },
                        data: {
                            dateAdded: new Date('2024-02-02'),
                        },
                    },
                },
                supportingDocuments: {
                    update: {
                        where: {
                            id: dummyRateDocS2.id!,
                        },
                        data: {
                            dateAdded: new Date('2024-02-02'),
                        },
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

    it('returns the questions on for a rate', async () => {
        // Create four CMS users, seed and assign divisions
        const dmcoCmsUser = testCMSUser()
        const dmco2CmsUser = testCMSUser({
            role: 'CMS_USER',
            email: 'zuko2@example.com',
            familyName: 'Zuko2',
            givenName: 'Prince',
            divisionAssignment: 'DMCO' as const,
        })
        const oactApproverUser = testCMSApproverUser({
            divisionAssignment: 'OACT',
        })
        const dmcpCmsUser = testCMSUser({
            divisionAssignment: 'DMCP',
        })
        await createDBUsersWithFullData([
            dmcoCmsUser,
            oactApproverUser,
            dmcpCmsUser,
            dmco2CmsUser,
        ])

        // Create servers
        const server = await constructTestPostgresServer()
        const dmcoServer = await constructTestPostgresServer({
            context: {
                user: dmcoCmsUser,
            },
        })
        const dmco2Server = await constructTestPostgresServer({
            context: {
                user: dmco2CmsUser,
            },
        })
        const dmcpServer = await constructTestPostgresServer({
            context: {
                user: dmcpCmsUser,
            },
        })
        const oactServer = await constructTestPostgresServer({
            context: {
                user: oactApproverUser,
            },
        })

        // Set up contract and rate submission and submit 1 question for each division
        const submittedRate = await createAndSubmitTestContractWithRate(server)
        const rateID =
            submittedRate.packageSubmissions[0].rateRevisions[0].rateID

        await createTestRateQuestion(dmcoServer, rateID)
        await createTestRateQuestion(dmcpServer, rateID)
        await createTestRateQuestion(oactServer, rateID)

        const result = await executeGraphQLOperation(server, {
            query: FetchRateWithQuestionsDocument,
            variables: {
                input: {
                    rateID,
                },
            },
        })
        const rateQuestions = result.data?.fetchRate.rate.questions

        // Expect each question in the correct division by the correct user
        expect(rateQuestions.DMCOQuestions.edges).toHaveLength(1)
        expect(rateQuestions.DMCOQuestions.edges[0].node.addedBy).toEqual(
            expect.objectContaining(dmcoCmsUser)
        )
        expect(rateQuestions.DMCPQuestions.edges).toHaveLength(1)
        expect(rateQuestions.DMCPQuestions.edges[0].node.addedBy).toEqual(
            expect.objectContaining(dmcpCmsUser)
        )
        expect(rateQuestions.OACTQuestions.edges).toHaveLength(1)
        expect(rateQuestions.OACTQuestions.edges[0].node.addedBy).toEqual(
            expect.objectContaining(oactApproverUser)
        )

        // Test newly created dmco question and its order
        await createTestRateQuestion(dmco2Server, rateID)
        const result2 = await executeGraphQLOperation(server, {
            query: FetchRateWithQuestionsDocument,
            variables: {
                input: {
                    rateID,
                },
            },
        })
        const rateQuestions2 = result2.data?.fetchRate.rate.questions

        // Expect 2 DMCO questions and the latest created question at index 0 by dmco2CmsUser
        expect(rateQuestions2.DMCOQuestions.edges).toHaveLength(2)
        expect(rateQuestions2.DMCOQuestions.edges[0].node.addedBy).toEqual(
            expect.objectContaining(dmco2CmsUser)
        )
        // Expect earlier DMCO question to be at index 1
        expect(rateQuestions2.DMCOQuestions.edges).toHaveLength(2)
        expect(rateQuestions2.DMCOQuestions.edges[1].node.addedBy).toEqual(
            expect.objectContaining(dmcoCmsUser)
        )
    })

    it('allows OAuth client with client_credentials to fetch rate', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })

        // Create contract and rate
        const contract =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const updatedContract = await addNewRateToTestContract(
            stateServer,
            contract
        )
        const rateID = updatedContract.draftRates?.[0]?.id

        // Create OAuth client context
        const oauthServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(), // CMS user for wider access
                oauthClient: {
                    clientId: 'test-oauth-client',
                    grants: ['client_credentials'],
                    issuer: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
            ldService,
            s3Client: mockS3,
        })

        const fetchResult = await executeGraphQLOperation(oauthServer, {
            query: FetchRateDocument,
            variables: {
                input: {
                    rateID,
                },
            },
        })

        expect(fetchResult.errors).toBeUndefined()
        expect(fetchResult.data?.fetchRate.rate).toBeDefined()
        expect(fetchResult.data?.fetchRate.rate.id).toBe(rateID)
    })

    it('denies OAuth client without read permissions', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })

        // Create contract and rate
        const contract =
            await createAndUpdateTestContractWithoutRates(stateServer)
        const updatedContract = await addNewRateToTestContract(
            stateServer,
            contract
        )
        const rateID = updatedContract.draftRates?.[0]?.id

        // Create OAuth client context without client_credentials grant
        const oauthServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
                oauthClient: {
                    clientId: 'test-oauth-client',
                    grants: ['some_other_grant'],
                    issuer: 'mcreview-test',
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
            ldService,
            s3Client: mockS3,
        })

        const fetchResult = await executeGraphQLOperation(oauthServer, {
            query: FetchRateDocument,
            variables: {
                input: {
                    rateID,
                },
            },
        })

        expect(fetchResult.errors).toBeDefined()
        expect(fetchResult.errors?.[0].extensions?.code).toBe('FORBIDDEN')
        expect(fetchResult.errors?.[0].message).toBe(
            'OAuth client does not have read permissions'
        )
    })
})
