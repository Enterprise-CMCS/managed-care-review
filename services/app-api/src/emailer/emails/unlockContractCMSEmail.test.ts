import {
    testEmailConfig,
    testStateAnalystsEmails,
    mockMNState,
    mockMSState,
    mockContractRev,
    mockUnlockedContract,
} from '../../testHelpers/emailerHelpers'
import { unlockContractCMSEmail } from './index'
import { packageName } from '@mc-review/submissions'

const unlockData = {
    updatedBy: {
        email: 'leslie@example.com',
        role: 'CMS_USER' as const,
        givenName: 'Leslie',
        familyName: 'Knope',
    },
    updatedAt: new Date('01/01/2022'),
    updatedReason: 'Adding rate development guide.',
}

const testStateAnalystEmails = testStateAnalystsEmails
const defaultStatePrograms = mockMNState().programs
const emailConfig = testEmailConfig()

describe('unlockPackageCMSEmail', () => {
    it('subject line is correct and clearly states submission is unlocked', async () => {
        const sub = mockUnlockedContract()

        const name = packageName(
            sub.stateCode,
            sub.stateNumber,
            sub.draftRevision.formData.programIDs,
            defaultStatePrograms
        )
        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(`${name} was unlocked`),
            })
        )
    })
    it('includes expected data summary for a contract and rates submission unlock CMS email', async () => {
        const sub = mockUnlockedContract()

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Unlocked by: leslie/),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Unlocked on: 12/),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /Reason for unlock: Adding rate development guide/
                ),
            })
        )
        expect(template.bodyText?.match(/Rate Cert Name/)?.length).toBe(1)
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    sub.draftRates?.[0].draftRevision?.formData
                        .rateCertificationName ?? ''
                ),
            })
        )
    })
    it('includes expected data summary for a multi-rate contract and rates submission unlock CMS email', async () => {
        const sub = mockUnlockedContract(undefined, [
            {
                id: 'rate-123',
                draftRevision: {
                    id: '12345',
                    rateID: '6789',
                    submitInfo: undefined,
                    unlockInfo: undefined,
                    createdAt: new Date(11 / 27 / 2023),
                    updatedAt: new Date(11 / 27 / 2023),
                    formData: {
                        id: 'test-id-1234',
                        rateID: 'test-id-1234',
                        rateType: 'NEW',
                        rateCapitationType: 'RATE_CELL',
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/test1',
                                name: 'foo',
                                sha256: 'fakesha',
                                dateAdded: new Date(11 / 27 / 2023),
                            },
                        ],
                        supportingDocuments: [],
                        rateDateStart: new Date('01/01/2024'),
                        rateDateEnd: new Date('01/01/2025'),
                        rateDateCertified: new Date('01/01/2024'),
                        amendmentEffectiveDateStart: new Date('01/01/2024'),
                        amendmentEffectiveDateEnd: new Date('01/01/2025'),
                        rateProgramIDs: [
                            '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        ],
                        rateCertificationName: 'Rate Cert Name 1',
                        certifyingActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@example.com',
                            },
                        ],
                        addtlActuaryContacts: [],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                        packagesWithSharedRateCerts: [
                            {
                                packageName: 'pkgName',
                                packageId: '12345',
                                packageStatus: 'SUBMITTED',
                            },
                        ],
                    },
                },
            },
            {
                id: 'rate-234',
                draftRevision: {
                    id: '12345',
                    rateID: '6789',
                    submitInfo: undefined,
                    unlockInfo: undefined,
                    createdAt: new Date(11 / 27 / 2023),
                    updatedAt: new Date(11 / 27 / 2023),
                    formData: {
                        id: 'test-id-1234',
                        rateID: 'test-id-1234',
                        rateType: 'NEW',
                        rateCapitationType: 'RATE_CELL',
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/test1',
                                name: 'foo',
                                sha256: 'fakesha',
                                dateAdded: new Date(11 / 27 / 2023),
                            },
                        ],
                        supportingDocuments: [],
                        rateDateStart: new Date('01/01/2024'),
                        rateDateEnd: new Date('01/01/2025'),
                        rateDateCertified: new Date('01/01/2024'),
                        amendmentEffectiveDateStart: new Date('01/01/2024'),
                        amendmentEffectiveDateEnd: new Date('01/01/2025'),
                        rateProgramIDs: [
                            '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        ],
                        rateCertificationName: 'Rate Cert Name 2',
                        certifyingActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@example.com',
                            },
                        ],
                        addtlActuaryContacts: [],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                        packagesWithSharedRateCerts: [
                            {
                                packageName: 'pkgName',
                                packageId: '12345',
                                packageStatus: 'SUBMITTED',
                            },
                        ],
                    },
                },
            },
            {
                id: 'rate-345',
                draftRevision: {
                    id: '12345',
                    rateID: '6789',
                    submitInfo: undefined,
                    unlockInfo: undefined,
                    createdAt: new Date(11 / 27 / 2023),
                    updatedAt: new Date(11 / 27 / 2023),
                    formData: {
                        id: 'test-id-1234',
                        rateID: 'test-id-1234',
                        rateType: 'NEW',
                        rateCapitationType: 'RATE_CELL',
                        rateDocuments: [
                            {
                                s3URL: 's3://bucketname/key/test1',
                                name: 'foo',
                                sha256: 'fakesha',
                                dateAdded: new Date(11 / 27 / 2023),
                            },
                        ],
                        supportingDocuments: [],
                        rateDateStart: new Date('01/01/2024'),
                        rateDateEnd: new Date('01/01/2025'),
                        rateDateCertified: new Date('01/01/2024'),
                        amendmentEffectiveDateStart: new Date('01/01/2024'),
                        amendmentEffectiveDateEnd: new Date('01/01/2025'),
                        rateProgramIDs: [
                            '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                        ],
                        rateCertificationName: 'Rate Cert Name 3',
                        certifyingActuaryContacts: [
                            {
                                actuarialFirm: 'DELOITTE',
                                name: 'Actuary Contact 1',
                                titleRole: 'Test Actuary Contact 1',
                                email: 'actuarycontact1@example.com',
                            },
                        ],
                        addtlActuaryContacts: [],
                        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                        packagesWithSharedRateCerts: [
                            {
                                packageName: 'pkgName',
                                packageId: '12345',
                                packageStatus: 'SUBMITTED',
                            },
                        ],
                    },
                },
            },
        ])
        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Unlocked by: leslie/),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(/Unlocked on: 12/),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringMatching(
                    /Reason for unlock: Adding rate development guide/
                ),
            })
        )
        //Expect only have 3 rate names using regex to match name pattern specific to rate names.
        expect(template.bodyText?.match(/Rate Cert Name/g)?.length).toBe(3)
        //First Rate certification
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    sub.draftRates?.[0].draftRevision?.formData
                        .rateCertificationName ?? ''
                ),
            })
        )
        //Second Rate certification
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    sub.draftRates?.[1].draftRevision?.formData
                        .rateCertificationName ?? 'NOPE'
                ),
            })
        )
        //Third Rate certification
        expect(template).toEqual(
            expect.objectContaining({
                bodyText: expect.stringContaining(
                    sub.draftRates?.[2].draftRevision?.formData
                        .rateCertificationName ?? 'NOPE'
                ),
            })
        )
    })
    it('to addresses list includes DMCP, OACT, and DMCO emails for contract and rate package', async () => {
        const sub = mockUnlockedContract()
        sub.draftRevision.formData.riskBasedContract = true
        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        emailConfig.oactEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })

        emailConfig.dmcpSubmissionEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })

        emailConfig.dmcoEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })

    it('to addresses list does not include help addresses', async () => {
        const sub = mockUnlockedContract()

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([
                    emailConfig.cmsRateHelpEmailAddress,
                ]),
            })
        )

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([
                    emailConfig.cmsReviewHelpEmailAddress,
                ]),
            })
        )
    })

    it('includes state specific analysts emails on contract and rate submission unlock', async () => {
        const sub = mockUnlockedContract()

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('includes correct toAddresses in contract and rate submission unlock', async () => {
        const sub = mockUnlockedContract()
        sub.draftRevision.formData.riskBasedContract = true
        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        const reviewerEmails = [
            ...emailConfig.devReviewTeamEmails,
            ...emailConfig.dmcoEmails,
            ...emailConfig.oactEmails,
        ]

        if (template instanceof Error) {
            throw template
        }

        reviewerEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([
                    ...emailConfig.cmsRateHelpEmailAddress,
                ]),
            })
        )
        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([
                    ...emailConfig.cmsReviewHelpEmailAddress,
                ]),
            })
        )
    })
    it('includes state specific analysts emails on contract only submission unlock', async () => {
        const sub = mockUnlockedContract()

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('does not include oactEmails on contract only submission unlock', async () => {
        const mockedContract = mockContractRev()
        const mockedDraftRevision = mockContractRev({
            formData: {
                ...mockedContract.formData,
                submissionType: 'CONTRACT_ONLY',
            },
        })

        const sub = mockUnlockedContract(
            {
                draftRevision: mockedDraftRevision,
            },
            []
        )

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        const ratesReviewerEmails = [...emailConfig.oactEmails]
        ratesReviewerEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('does not include oactEmails on non risked based submission unlock', async () => {
        const sub = mockUnlockedContract()

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        const ratesReviewerEmails = [...emailConfig.oactEmails]
        ratesReviewerEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('does not include state analysts emails on contract only submission unlock when none passed in', async () => {
        const sub = mockUnlockedContract()

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('CHIP contract only unlock email does include state specific analysts emails', async () => {
        const mockedContract = mockContractRev()
        const mockedDraftRevision = mockContractRev({
            formData: {
                ...mockedContract.formData,
                programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
                submissionType: 'CONTRACT_ONLY',
                populationCovered: 'CHIP',
            },
        })

        const sub = mockUnlockedContract(
            {
                stateCode: 'MS',
                draftRevision: mockedDraftRevision,
            },
            []
        )

        const msStatePrograms = mockMSState().programs
        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            msStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('CHIP contract only unlock email does not include oactEmails or state specific analysts emails', async () => {
        const mockedContract = mockContractRev()
        const mockedDraftRevision = mockContractRev({
            formData: {
                ...mockedContract.formData,
                programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
                submissionType: 'CONTRACT_ONLY',
                populationCovered: 'CHIP',
            },
        })

        const sub = mockUnlockedContract(
            {
                stateCode: 'MS',
                draftRevision: mockedDraftRevision,
            },
            []
        )

        const msStatePrograms = mockMSState().programs
        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            [],
            msStatePrograms
        )
        const excludedEmails = [...emailConfig.oactEmails]

        if (template instanceof Error) {
            throw template
        }

        excludedEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('CHIP contract and rate unlock email does include state specific analysts emails', async () => {
        const mockedContract = mockContractRev()
        const mockedDraftRevision = mockContractRev({
            formData: {
                ...mockedContract.formData,
                programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
                submissionType: 'CONTRACT_ONLY',
                populationCovered: 'CHIP',
            },
        })

        const sub = mockUnlockedContract(
            {
                stateCode: 'MS',
                draftRevision: mockedDraftRevision,
            },
            []
        )

        const msStatePrograms = mockMSState().programs
        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            msStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('CHIP contract and rate unlock email does not include oactEmails or state specific analysts emails', async () => {
        const mockedContract = mockContractRev()
        const mockedDraftRevision = mockContractRev({
            formData: {
                ...mockedContract.formData,
                programIDs: ['36c54daf-7611-4a15-8c3b-cdeb3fd7e25a'],
                submissionType: 'CONTRACT_ONLY',
                populationCovered: 'CHIP',
            },
        })

        const sub = mockUnlockedContract(
            {
                stateCode: 'MS',
                draftRevision: mockedDraftRevision,
            },
            []
        )

        const msStatePrograms = mockMSState().programs
        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            [],
            msStatePrograms
        )
        const excludedEmails = [...emailConfig.oactEmails]

        if (template instanceof Error) {
            throw template
        }

        excludedEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
        testStateAnalystEmails.forEach((emailAddress) => {
            expect(template).toEqual(
                expect.objectContaining({
                    toAddresses: expect.not.arrayContaining([emailAddress]),
                })
            )
        })
    })
    it('does not include rate name on contract only submission unlock', async () => {
        const sub = mockUnlockedContract()

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.not.objectContaining({
                bodyText: expect.stringMatching(/Rate names:/),
            })
        )
    })

    it('renders overall email as expected', async () => {
        const sub = mockUnlockedContract()

        const template = await unlockContractCMSEmail(
            sub,
            unlockData,
            emailConfig,
            [],
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })
})

describe('unlockEQROCMSEmail', () => {
    it('renders CMS email for unlocked EQRO contract as expected', async () => {
        const eqroSub = mockUnlockedContract({
            contractSubmissionType: 'EQRO',
        })

        const template = await unlockContractCMSEmail(
            eqroSub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })

    it('includes reviewer emails as expected', async () => {
        const eqroSub = mockUnlockedContract({
            contractSubmissionType: 'EQRO',
        })

        const template = await unlockContractCMSEmail(
            eqroSub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                toAddresses: expect.arrayContaining(emailConfig.dmcoEmails),
            })
        )
    })

    it('subject line is correct and clearly states submission is unlocked', async () => {
        const eqroSub = mockUnlockedContract({
            contractSubmissionType: 'EQRO',
        })

        const subName = packageName(
            eqroSub.stateCode,
            eqroSub.stateNumber,
            eqroSub.draftRevision.formData.programIDs,
            defaultStatePrograms
        )

        const template = await unlockContractCMSEmail(
            eqroSub,
            unlockData,
            emailConfig,
            testStateAnalystEmails,
            defaultStatePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template).toEqual(
            expect.objectContaining({
                subject: expect.stringContaining(`${subName} was unlocked`),
            })
        )
    })
})
