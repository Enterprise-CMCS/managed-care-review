import type { EmailConfiguration, EmailData, Emailer } from '../emailer'
import { emailer } from '../emailer'
import type { ProgramArgType } from '@mc-review/submissions'
import type {
    ContractRevisionType,
    ContractType,
    ContractQuestionType,
    RatePackageSubmissionType,
    RateRevisionType,
    RateType,
    UnlockedContractType,
    UpdateInfoType,
    RateQuestionType,
} from '../domain-models'
import { SESServiceException } from '@aws-sdk/client-ses'
import { testSendSESEmail } from './awsSESHelpers'
import { testCMSUser, testStateUser } from './userHelpers'
import { v4 as uuidv4 } from 'uuid'
import { constructTestEmailer } from './gqlHelpers'
import type { Store } from '../postgres'

const testEmailConfig = (): EmailConfiguration => ({
    stage: 'LOCAL',
    baseUrl: 'http://localhost',
    emailSource: 'emailSource@example.com',
    devReviewTeamEmails: ['devreview1@example.com', 'devreview2@example.com'],
    cmsReviewHelpEmailAddress: '"MCOG Example" <mcog@example.com>',
    cmsRateHelpEmailAddress: '"Rates Example" <rates@example.com>',
    oactEmails: ['ratesreview@example.com'],
    dmcpReviewEmails: ['policyreview1@example.com'],
    dmcpSubmissionEmails: ['policyreviewsubmission1@example.com'],
    dmcoEmails: ['overallreview@example.com'],
    helpDeskEmail: '"MC-Review Help Desk" <MC_Review_HelpDesk@example.com>',
})

const testDuplicateEmailConfig: EmailConfiguration = {
    stage: 'LOCAL',
    baseUrl: 'http://localhost',
    emailSource: 'emailSource@example.com',
    devReviewTeamEmails: [
        'duplicate@example.com',
        'duplicate@example.com',
        'duplicate@example.com',
    ],
    cmsReviewHelpEmailAddress: 'duplicate@example.com',
    cmsRateHelpEmailAddress: 'duplicate@example.com',
    oactEmails: ['duplicate@example.com', 'duplicate@example.com'],
    dmcpReviewEmails: ['duplicate@example.com', 'duplicate@example.com'],
    dmcpSubmissionEmails: ['duplicate@example.com', 'duplicate@example.com'],
    dmcoEmails: ['duplicate@example.com', 'duplicate@example.com'],
    helpDeskEmail: 'duplicate@example.com',
}

const testStateAnalystsEmails: string[] = [
    '"State Analyst 1" <StateAnalyst1@example.com>',
    '"State Analyst 2" <StateAnalyst2@example.com>',
]

const testDuplicateStateAnalystsEmails: string[] = [
    'duplicate@example.com',
    'duplicate@example.com',
]
const s3DlUrl =
    'https://fake-bucket.s3.amazonaws.com/file.pdf?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Expires=1719564800&Signature=abc123def456ghijk' //pragma: allowlist secret

const sendTestEmails = async (emailData: EmailData): Promise<void | Error> => {
    try {
        await testSendSESEmail(emailData)
    } catch (err) {
        if (err instanceof SESServiceException) {
            return new Error(
                'SES email send failed. Error is from Amazon SES. Error: ' +
                    JSON.stringify(err)
            )
        }
        return new Error('SES email send failed. Error: ' + err)
    }
}

function testEmailer(customConfig?: EmailConfiguration): Emailer {
    const config = customConfig || testEmailConfig()
    return emailer(config, vi.fn(sendTestEmails))
}

async function testEmailerFromDatabase(
    store: Store,
    customConfig?: EmailConfiguration
): Promise<Emailer> {
    const mockEmailer = await constructTestEmailer({
        emailConfig: customConfig ?? testEmailConfig(),
        postgresStore: store,
    })

    mockEmailer.sendEmail = vi.fn()

    return mockEmailer
}

type State = {
    name: string
    programs: ProgramArgType[]
    code: string
}

export function mockMNState(): State {
    return {
        name: 'Minnesota',
        programs: [
            {
                id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                fullName: 'Special Needs Basic Care',
                name: 'SNBC',
                isRateProgram: false,
            },
            {
                id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                fullName: 'Prepaid Medical Assistance Program',
                name: 'PMAP',
                isRateProgram: false,
            },
            {
                id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                fullName: 'Minnesota Senior Care Plus ',
                name: 'MSC+',
                isRateProgram: false,
            },
            {
                id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                fullName: 'Minnesota Senior Health Options',
                name: 'MSHO',
                isRateProgram: false,
            },
        ],
        code: 'MN',
    }
}

export function mockMSState(): State {
    return {
        name: 'Mississippi',
        programs: [
            {
                id: 'e0819153-5894-4153-937e-aad00ab01a8f',
                fullName: 'Mississippi Coordinated Access Network',
                name: 'MSCAN',
                isRateProgram: false,
            },
            {
                id: '36c54daf-7611-4a15-8c3b-cdeb3fd7e25a',
                fullName: 'CHIP',
                name: 'CHIP',
                isRateProgram: false,
            },
        ],
        code: 'MS',
    }
}

const mockContractRev = (
    submissionPartial?: Partial<ContractRevisionType>
): ContractRevisionType => {
    return {
        createdAt: new Date('01/01/2021'),
        updatedAt: new Date('02/01/2021'),
        contract: {
            stateCode: 'MN',
            stateNumber: 3,
            id: '12345',
        },
        id: 'test-abc-125',
        formData: {
            programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            populationCovered: 'MEDICAID',
            submissionType: 'CONTRACT_AND_RATES',
            riskBasedContract: false,
            submissionDescription: 'A submitted submission',
            stateContacts: [
                {
                    name: 'Test Person',
                    titleRole: 'A Role',
                    email: 'test+state+contact@example.com',
                },
            ],
            supportingDocuments: [
                {
                    s3URL: 's3://bucketname/key/test1',
                    name: 'foo',
                    sha256: 'fakesha',
                    dateAdded: new Date('02/01/2021'),
                },
            ],
            contractType: 'BASE',
            contractExecutionStatus: undefined,
            contractDocuments: [
                {
                    s3URL: 's3://bucketname/key/test1',
                    name: 'foo',
                    sha256: 'fakesha',
                    dateAdded: new Date('02/01/2021'),
                },
            ],
            contractDateStart: new Date('01/01/2024'),
            contractDateEnd: new Date('01/01/2025'),
            managedCareEntities: ['MCO'],
            federalAuthorities: ['VOLUNTARY', 'BENCHMARK'],
            inLieuServicesAndSettings: undefined,
            modifiedBenefitsProvided: undefined,
            modifiedGeoAreaServed: undefined,
            modifiedMedicaidBeneficiaries: undefined,
            modifiedRiskSharingStrategy: undefined,
            modifiedIncentiveArrangements: undefined,
            modifiedWitholdAgreements: undefined,
            modifiedStateDirectedPayments: undefined,
            modifiedPassThroughPayments: undefined,
            modifiedPaymentsForMentalDiseaseInstitutions: undefined,
            modifiedMedicalLossRatioStandards: undefined,
            modifiedOtherFinancialPaymentIncentive: undefined,
            modifiedEnrollmentProcess: undefined,
            modifiedGrevienceAndAppeal: undefined,
            modifiedNetworkAdequacyStandards: undefined,
            modifiedLengthOfContract: undefined,
            modifiedNonRiskPaymentArrangements: undefined,
            statutoryRegulatoryAttestation: undefined,
            statutoryRegulatoryAttestationDescription: undefined,
        },
        ...submissionPartial,
    }
}

const mockRateRevision = (
    rateRevPartial?: Partial<RateRevisionType>
): RateRevisionType => {
    return {
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
            rateProgramIDs: ['3fd36500-bf2c-47bc-80e8-e7aa417184c5'],
            rateCertificationName: 'Rate Cert Name',
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
        ...rateRevPartial,
    }
}

const mockRate = (ratePartial?: Partial<RateType>): RateType => {
    const submitInfo: UpdateInfoType = {
        updatedAt: new Date('02/01/2021'),
        updatedBy: {
            role: 'STATE_USER',
            email: 'someone@example.com',
            givenName: 'Someone',
            familyName: 'Example',
        },
        updatedReason: 'Initial submission',
    }
    const rateRev = mockRateRevision({
        submitInfo,
    })
    const contractRev = mockContractRev({
        id: 'test-contract-234',
        submitInfo,
    })
    const rateSubmission: RatePackageSubmissionType = {
        submitInfo,
        submittedRevisions: [rateRev, contractRev],
        rateRevision: rateRev,
        contractRevisions: [contractRev],
    }

    return {
        id: 'test-rate-234',
        createdAt: new Date('01/01/2021'),
        updatedAt: new Date('02/01/2021'),
        status: 'SUBMITTED',
        stateCode: 'MN',
        stateNumber: 2,
        parentContractID: 'test-contract-234',
        reviewStatus: 'UNDER_REVIEW',
        consolidatedStatus: 'SUBMITTED',
        revisions: [rateRev],
        packageSubmissions: [rateSubmission],
        questions: {
            DMCOQuestions: {
                totalCount: 1,
                edges: [
                    {
                        node: mockRateQuestionAndResponses({
                            id: 'dmco-rate-question-1',
                            rateID: 'test-rate-234',
                            createdAt: new Date('2024-04-23'),
                            addedBy: testCMSUser({
                                divisionAssignment: 'DMCO',
                            }),
                            division: 'DMCO',
                            documents: [
                                {
                                    id: 'dmco-rate-question-1',
                                    name: 'dmco-rate-question-1',
                                    s3URL: 's3://bucketName/key/dmco-rate-question-1-doc',
                                    downloadURL:
                                        'https://fake-bucket.s3.amazonaws.com/test',
                                },
                            ],
                        }),
                    },
                ],
            },
            DMCPQuestions: {
                totalCount: 0,
                edges: [],
            },
            OACTQuestions: {
                totalCount: 0,
                edges: [],
            },
        },

        ...ratePartial,
    }
}

const mockUnlockedContract = (
    contractPartial?: Partial<UnlockedContractType>,
    rateParitals?: Partial<RateType>[]
): UnlockedContractType => {
    const draftRates = rateParitals
        ? rateParitals.map((r) => mockRate(r))
        : [mockRate()]

    return {
        ...mockContract(),
        id: 'test-contract-123',
        createdAt: new Date('01/01/2021'),
        updatedAt: new Date('02/01/2021'),
        status: 'UNLOCKED',
        consolidatedStatus: 'UNLOCKED',
        reviewStatus: 'UNDER_REVIEW',
        stateCode: 'MN',
        stateNumber: 4,
        draftRevision: mockContractRev(),
        draftRates,
        ...contractPartial,
    }
}

const mockContract = (
    contractPartial?: Partial<ContractType>
): ContractType => {
    return {
        id: 'test-contract-123',
        contractSubmissionType: 'HEALTH_PLAN',
        createdAt: new Date('01/01/2021'),
        updatedAt: new Date('02/01/2021'),
        status: 'SUBMITTED',
        reviewStatus: 'UNDER_REVIEW',
        consolidatedStatus: 'SUBMITTED',
        stateCode: 'MN',
        stateNumber: 4,
        revisions: [],
        packageSubmissions: [
            {
                submitInfo: {
                    updatedAt: new Date('01/01/2023'),
                    updatedBy: {
                        email: 'example@example.com',
                        role: 'STATE_USER',
                        givenName: 'John',
                        familyName: 'Vila',
                    },
                    updatedReason: 'contract submit',
                },
                submittedRevisions: [],
                contractRevision: {
                    createdAt: new Date('01/01/2024'),
                    updatedAt: new Date('01/01/2025'),
                    id: '123',
                    contract: {
                        id: 'test-abc-123',
                        stateCode: 'MN',
                        stateNumber: 4,
                    },
                    submitInfo: {
                        updatedAt: new Date(),
                        updatedBy: {
                            email: 'example@example.com',
                            role: 'STATE_USER',
                            givenName: 'John',
                            familyName: 'Vila',
                        },
                        updatedReason: 'contract submit',
                    },
                    unlockInfo: undefined,
                    formData: {
                        programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                        populationCovered: 'MEDICAID',
                        submissionType: 'CONTRACT_AND_RATES',
                        riskBasedContract: true,
                        submissionDescription: 'A real submission',
                        supportingDocuments: [
                            {
                                s3URL: 's3://bucketname/key/contractsupporting1',
                                sha256: 'fakesha',
                                name: 'contractSupporting1',
                                dateAdded: new Date('01/15/2024'),
                                downloadURL: s3DlUrl,
                            },
                            {
                                s3URL: 's3://bucketname/key/contractSupporting2',
                                sha256: 'fakesha',
                                name: 'contractSupporting2',
                                dateAdded: new Date('01/13/2024'),
                                downloadURL: s3DlUrl,
                            },
                        ],
                        stateContacts: [
                            {
                                name: 'contract-state-contact',
                                titleRole: 'state contact',
                                email: 'contract-state-contact@example.com',
                            },
                        ],
                        contractType: 'AMENDMENT',
                        contractExecutionStatus: 'EXECUTED',
                        contractDocuments: [
                            {
                                s3URL: 's3://bucketname/key/contract',
                                sha256: 'fakesha',
                                name: 'contract',
                                dateAdded: new Date('01/01/2024'),
                                downloadURL: s3DlUrl,
                            },
                        ],
                        contractDateStart: new Date(),
                        contractDateEnd: new Date(),
                        managedCareEntities: ['MCO'],
                        federalAuthorities: ['STATE_PLAN'],
                        inLieuServicesAndSettings: true,
                        modifiedBenefitsProvided: true,
                        modifiedGeoAreaServed: false,
                        modifiedMedicaidBeneficiaries: true,
                        modifiedRiskSharingStrategy: true,
                        modifiedIncentiveArrangements: false,
                        modifiedWitholdAgreements: false,
                        modifiedStateDirectedPayments: true,
                        modifiedPassThroughPayments: true,
                        modifiedPaymentsForMentalDiseaseInstitutions: false,
                        modifiedMedicalLossRatioStandards: true,
                        modifiedOtherFinancialPaymentIncentive: false,
                        modifiedEnrollmentProcess: true,
                        modifiedGrevienceAndAppeal: false,
                        modifiedNetworkAdequacyStandards: true,
                        modifiedLengthOfContract: false,
                        modifiedNonRiskPaymentArrangements: true,
                        statutoryRegulatoryAttestation: true,
                        statutoryRegulatoryAttestationDescription:
                            'everything meets regulatory attestation',
                    },
                },
                rateRevisions: [
                    {
                        id: '1234',
                        rateID: '123',
                        createdAt: new Date('01/01/2023'),
                        updatedAt: new Date('01/01/2023'),
                        formData: {
                            rateCertificationName: 'rate cert',
                            rateType: 'AMENDMENT',
                            rateCapitationType: 'RATE_CELL',
                            rateDocuments: [
                                {
                                    s3URL: 's3://bucketname/key/rate',
                                    sha256: 'fakesha',
                                    name: 'rate',
                                    dateAdded: new Date('01/01/2023'),
                                    downloadURL: s3DlUrl,
                                },
                            ],
                            supportingDocuments: [
                                {
                                    s3URL: 's3://bucketname/key/rateSupporting1',
                                    sha256: 'fakesha',
                                    name: 'rate supporting 1',
                                    dateAdded: new Date('01/15/2023'),
                                    downloadURL: s3DlUrl,
                                },
                                {
                                    s3URL: 's3://bucketname/key/rateSupporting1',
                                    sha256: 'fakesha',
                                    name: 'rate supporting 2',
                                    dateAdded: new Date('01/15/2023'),
                                    downloadURL: s3DlUrl,
                                },
                            ],
                            rateDateStart: new Date(),
                            rateDateEnd: new Date(),
                            rateDateCertified: new Date(),
                            amendmentEffectiveDateStart: new Date(),
                            amendmentEffectiveDateEnd: new Date(),
                            rateProgramIDs: [
                                'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                            ],
                            deprecatedRateProgramIDs: [],
                            certifyingActuaryContacts: [
                                {
                                    actuarialFirm: 'DELOITTE',
                                    name: 'Actuary Contact 1',
                                    titleRole: 'Test Actuary Contact 1',
                                    email: 'actuarycontact1@test.com',
                                },
                            ],
                            addtlActuaryContacts: [
                                {
                                    actuarialFirm: 'DELOITTE',
                                    name: 'Actuary Contact 1',
                                    titleRole: 'Test Actuary Contact 1',
                                    email: 'actuarycontact1@test.com',
                                },
                            ],
                            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                            packagesWithSharedRateCerts: [],
                        },
                    },
                ],
            },
        ],
        ...contractPartial,
    }
}

const mockCommonQuestionAndResponses = <
    T extends
        | (Partial<ContractQuestionType> & { contractID: string })
        | (Partial<RateQuestionType> & { rateID: string }),
    R extends ContractQuestionType | RateQuestionType,
>(
    questionData?: T
): R => {
    const question = {
        id: `test-question-id-1`,
        createdAt: new Date('01/01/2024'),
        addedBy: testCMSUser(),
        documents: [
            {
                name: 'Test Question',
                s3URL: 's3://bucketname/key/test1',
                downloadURL: 'https://fake-bucket.s3.amazonaws.com/test',
            },
        ],
        division: 'DMCO',
        responses: [
            {
                id: 'test-question-response-id-1',
                questionID: 'test-question-id-1',
                createdAt: new Date('01/02/2024'),
                addedBy: testStateUser(),
                documents: [
                    {
                        name: 'Test Question Response',
                        s3URL: 's3://bucketname/key/test1response',
                        downloadURL:
                            'https://fake-bucket.s3.amazonaws.com/test1response',
                    },
                ],
            },
        ],
        ...questionData,
    }

    const defaultResponses = [
        {
            id: uuidv4(),
            questionID: question.id,
            //Add 1 day to date, to make sure this date is always after question.createdAt
            createdAt: ((): Date => {
                const responseDate = new Date(question.createdAt)
                return new Date(
                    responseDate.setDate(responseDate.getDate() + 1)
                )
            })(),
            addedBy: testStateUser(),
            documents: [
                {
                    name: 'Test Question Response',
                    s3URL: 's3://bucketname/key/test1',
                    downloadURL: 'https://fake-bucket.s3.amazonaws.com/test',
                },
            ],
        },
    ]

    // If responses are passed in, use that and replace questionIDs, so they match the question.
    question.responses = questionData?.responses
        ? questionData.responses.map((response) => ({
              ...response,
              questionID: question.id,
          }))
        : defaultResponses

    return question as R
}

const mockQuestionAndResponses = (
    question: Partial<ContractQuestionType> & { contractID: string }
): ContractQuestionType => mockCommonQuestionAndResponses(question)

const mockRateQuestionAndResponses = (
    question: Partial<RateQuestionType> & { rateID: string }
): RateQuestionType => mockCommonQuestionAndResponses(question)

export {
    testEmailConfig,
    testStateAnalystsEmails,
    testDuplicateEmailConfig,
    testDuplicateStateAnalystsEmails,
    mockContractRev,
    mockContract,
    mockUnlockedContract,
    testEmailer,
    mockQuestionAndResponses,
    mockRateQuestionAndResponses,
    mockRate,
    testEmailerFromDatabase,
    mockRateRevision,
}
