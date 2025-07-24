import {
    CmsUser,
    Contract,
    ContractPackageSubmission,
    ContractRevision,
    Rate,
    RatePackageSubmission,
    RateRevision,
    StateUser,
    UpdateInformation,
    RateStripped
} from '../gen/gqlClient'
import { s3DlUrl } from './documentDataMock'
import { mockMNState } from './stateMock'
import { v4 as uuidv4 } from 'uuid'
import { updateInfoMock } from './updateInfoMocks'
import { mockContractRevision } from './contractPackageDataMock'
import { mockValidCMSUser, mockValidUser } from './userGQLMock'

const rateRevisionDataMock = (data?: Partial<RateRevision>): RateRevision => {
    return {
        id: data?.id ?? uuidv4(),
        rateID: '456',
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:02:26.767Z',
        unlockInfo: null,
        submitInfo: {
            __typename: 'UpdateInformation',
            updatedAt: '2023-10-16T19:02:26.766Z',
            updatedBy: {
                email: 'aang@example.com',
                role: 'STATE_USER',
                familyName: 'Airman',
                givenName: 'Aang',
            },
            updatedReason: 'Initial submission',
        },
        formData: {
            rateType: 'AMENDMENT',
            rateCapitationType: 'RATE_CELL',
            // rateMedicaidPopulations: [
            //     "MEDICARE_MEDICAID_WITH_DSNP",
            //     "MEDICAID_ONLY",
            //     "MEDICARE_MEDICAID_WITHOUT_DSNP"
            // ],
            rateDocuments: [
                {
                    id: 'rate-document.pdf',
                    __typename: 'GenericDocument',
                    name: 'rate-document.pdf',
                    s3URL: 's3://bucketname/key/rate-document',
                    sha256: 'fakeSha',
                    dateAdded: new Date(), // new document
                    downloadURL: s3DlUrl,
                },
            ],
            supportingDocuments: [
                {
                    id: 'rate-supporting-document.pdf',
                    __typename: 'GenericDocument',
                    name: 'rate-supporting-document.pdf',
                    s3URL: 's3://bucketname/key/rate-supporting-document',
                    sha256: 'fakeSha',
                    dateAdded: new Date('10/01/2023'), //existing document
                    downloadURL: s3DlUrl,
                },
            ],
            rateDateStart: '2023-02-01',
            rateDateEnd: '2025-03-01',
            rateDateCertified: '2024-03-01',
            amendmentEffectiveDateStart: '2024-03-01',
            amendmentEffectiveDateEnd: '2025-03-01',
            rateProgramIDs: ['d95394e5-44d1-45df-8151-1cc1ee66f100'],
            consolidatedRateProgramIDs: [
                'd95394e5-44d1-45df-8151-1cc1ee66f100',
            ],
            deprecatedRateProgramIDs: [],
            rateCertificationName:
                'MCR-MN-0003-PMAP-RATE-20240301-20250301-AMENDMENT-20240301',
            certifyingActuaryContacts: [
                {
                    __typename: 'ActuaryContact',
                    id: '123-cert-actuary',
                    name: 'Actuary Contact Person',
                    titleRole: 'Actuary Contact Title',
                    email: 'actuarycontact@example.com',
                    actuarialFirm: 'MERCER',
                    actuarialFirmOther: '',
                },
            ],
            addtlActuaryContacts: [
                {
                    __typename: 'ActuaryContact',
                    id: '123-additional-actuary',
                    name: 'Additional actuary name',
                    titleRole: 'Additional actuary title',
                    email: 'additonalactuary@example.com',
                    actuarialFirm: 'MILLIMAN',
                    actuarialFirmOther: '',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
            packagesWithSharedRateCerts: [
                {
                    __typename: 'PackageWithSameRate',
                    packageName: 'MCR-MN-0001-PMAP',
                    packageId: 'f3306599-a1c9-411a-87ac-fa3541c3e723',
                    packageStatus: 'DRAFT',
                },
                {
                    __typename: 'PackageWithSameRate',
                    packageName: 'MCR-MN-0002-PMAP',
                    packageId: '1bf66cff-512b-4a30-bea8-5e27d1764810',
                    packageStatus: 'SUBMITTED',
                },
            ],
            __typename: 'RateFormData',
        },
        __typename: 'RateRevision',
        ...data,
    }
}

const draftRateDataMock = (
    rate?: Partial<Rate>,
    draftRevision?: Partial<RateRevision>
): Rate => {
    const rateID = rate?.id ?? uuidv4()
    return {
        __typename: 'Rate',
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:01:21.389Z',
        stateCode: 'MN',
        stateNumber: 10,
        parentContractID: 'foo-bar',
        webURL: 'https://testmcreview.example/rateID',
        state: mockMNState(),
        status: 'DRAFT',
        reviewStatus: 'UNDER_REVIEW',
        consolidatedStatus: 'DRAFT',
        reviewStatusActions: [],
        initiallySubmittedAt: new Date('2023-10-16'),
        draftRevision: {
            ...rateRevisionDataMock({ submitInfo: null, ...draftRevision }),
        },
        revisions: [],
        withdrawnFromContracts: [],
        ...rate,
        id: rateID,
    }
}

function rateSubmissionPackageMock(
    submitInfo: UpdateInformation,
    rateRev: RateRevision,
    contractRevs: ContractRevision[]
): RatePackageSubmission {
    return {
        __typename: 'RatePackageSubmission',
        cause: 'CONTRACT_SUBMISSION',
        submitInfo: submitInfo,
        submittedRevisions: [rateRev, ...contractRevs],
        rateRevision: rateRev,
        contractRevisions: contractRevs,
    }
}

function contractSubmissionPackageMock(
    submitInfo: UpdateInformation,
    contractRev: ContractRevision,
    rateRevs: RateRevision[]
): ContractPackageSubmission {
    return {
        __typename: 'ContractPackageSubmission',
        cause: 'CONTRACT_SUBMISSION',
        submitInfo: submitInfo,
        submittedRevisions: [contractRev, ...rateRevs],
        contractRevision: contractRev,
        rateRevisions: rateRevs,
    }
}

const rateDataMock = (
    revision?: Partial<RateRevision>,
    rate?: Partial<Rate>
): Rate => {
    const rateID = rate?.id ?? uuidv4()

    const { r1 } = submittedLinkedRatesScenarioMock()
    const latestSub = r1.packageSubmissions?.[0]
    if (!latestSub) {
        throw new Error('Bad package submission')
    }

    const latestRev = latestSub.rateRevision
    const modifiedRev: RateRevision = {
        ...latestRev,
        ...revision,
    }

    const finalRate: Rate = {
        ...r1,
        __typename: 'Rate',
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:01:21.389Z',
        stateCode: 'MN',
        stateNumber: 10,
        state: mockMNState(),
        status: 'RESUBMITTED',
        initiallySubmittedAt: new Date('2023-10-16'),
        draftRevision: null,
        parentContractID: 'foo-bar',
        id: rateID,
        withdrawnFromContracts: [],
        ...rate,
    }

    finalRate.revisions[0] = modifiedRev
    latestSub.rateRevision = modifiedRev

    return finalRate
}

const strippedRateDataMock = (
    revision?: Partial<RateRevision>,
    rate?: Partial<Rate>
): RateStripped => {
    const fullRate = rateDataMock(revision, rate)

    const strippedRate: RateStripped = {
        ...fullRate,
        draftRevision: {
            ...fullRate.revisions[0],
            __typename: 'RateRevisionStripped',
            formData: {
                ...fullRate.revisions[0].formData,
                __typename: 'RateFormDataStripped'
            }
        },
        latestSubmittedRevision: {
            ...fullRate.revisions[0],
            __typename: 'RateRevisionStripped',
            formData: {
                ...fullRate.revisions[0].formData,
                __typename: 'RateFormDataStripped'
            }
        },
        __typename: 'RateStripped'
    }

    return strippedRate
}

// n. b. at time of this writing we don't return draftContracts on Rates yet, so this is simpler than the setup
// makes it seem.
function rateUnlockedWithHistoryMock(): Rate {
    const { r1 } = submittedLinkedRatesScenarioMock()

    const draftRevision = rateRevisionDataMock({
        id: 'rr-03',
        submitInfo: null,
    })

    r1.status = 'UNLOCKED'
    r1.consolidatedStatus = 'UNLOCKED'
    r1.draftRevision = draftRevision

    return r1
}

function rateWithHistoryMock(): Rate {
    const { r1 } = submittedLinkedRatesScenarioMock()
    return r1
}

function submittedLinkedRatesScenarioMock(): {
    r1: Rate
    c1: Contract
    c2: Contract
} {
    const c1r1sub1 = updateInfoMock(new Date(2024, 1, 1), 'Initial Submission')
    const r1r01 = rateRevisionDataMock({
        id: 'rr-01',
        submitInfo: c1r1sub1,
    })
    const c1r01 = mockContractRevision('1', {
        contractID: 'c-01',
        submitInfo: c1r1sub1,
        contractName: 'MCR-MN-0005-SNBC',
    })

    const r1r1pkg = rateSubmissionPackageMock(c1r1sub1, r1r01, [c1r01])
    const c1r1pkg = contractSubmissionPackageMock(c1r1sub1, c1r01, [r1r01])

    const c2r1sub1 = updateInfoMock(new Date(2024, 1, 2), 'Initial Submission')
    const c2r1 = mockContractRevision('2', {
        contractID: 'c-02',
        submitInfo: c2r1sub1,
        contractName: 'MCR-MN-0006-SNBC',
    })

    const r1r1c2pkg = rateSubmissionPackageMock(c2r1sub1, r1r01, [c1r01, c2r1])
    const c2r1r1pkg = contractSubmissionPackageMock(c2r1sub1, c2r1, [r1r01])

    const r1c2sub = updateInfoMock(new Date(2024, 1, 3), 'Rate Submission')
    const r1r2 = rateRevisionDataMock({
        id: 'rr-02',
        submitInfo: r1c2sub,
    })

    const r1r2c1c2pkg = rateSubmissionPackageMock(r1c2sub, r1r2, [c1r01, c2r1])
    const c1r1r2pkg = contractSubmissionPackageMock(r1c2sub, c1r01, [r1r2])
    const c2r1r2pkg = contractSubmissionPackageMock(r1c2sub, c2r1, [r1r2])

    const c1: Contract = {
        __typename: 'Contract',
        initiallySubmittedAt: undefined,
        status: 'SUBMITTED',
        consolidatedStatus: 'SUBMITTED',
        reviewStatus: 'UNDER_REVIEW',
        createdAt: new Date(2024, 1, 1),
        updatedAt: new Date(),
        lastUpdatedForDisplay: new Date(),
        webURL: 'https://testmcreview.example/submission/c-01',
        id: 'c-01',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        mccrsID: undefined,
        packageSubmissions: [c1r1r2pkg, c1r1pkg],
    }

    const c2: Contract = {
        __typename: 'Contract',
        initiallySubmittedAt: undefined,
        status: 'SUBMITTED',
        consolidatedStatus: 'SUBMITTED',
        reviewStatus: 'UNDER_REVIEW',
        createdAt: new Date(2024, 1, 1),
        updatedAt: new Date(),
        lastUpdatedForDisplay: new Date(),
        webURL: 'https://testmcreview.example/submission/c-02',
        id: 'c-02',
        stateCode: 'MN',
        state: mockMNState(),
        stateNumber: 5,
        mccrsID: undefined,
        packageSubmissions: [c2r1r2pkg, c2r1r1pkg],
    }

    const r1: Rate = {
        __typename: 'Rate',
        createdAt: '2023-10-16T19:01:21.389Z',
        updatedAt: '2023-10-16T19:01:21.389Z',
        stateCode: 'MN',
        stateNumber: 10,
        state: mockMNState(),
        status: 'RESUBMITTED',
        reviewStatus: 'UNDER_REVIEW',
        consolidatedStatus: 'RESUBMITTED',
        reviewStatusActions: [],
        initiallySubmittedAt: new Date('2023-10-16'),
        webURL: 'https://testmcreview.example/rate/r-01',
        draftRevision: null,
        parentContractID: 'c-01',
        id: 'r-01',
        revisions: [r1r2, r1r01],
        withdrawnFromContracts: [],
        packageSubmissions: [r1r2c1c2pkg, r1r1c2pkg, r1r1pkg],
    }

    return {
        r1,
        c1,
        c2,
    }
}

// intended for use with related GQL Moc file.
function mockRateSubmittedWithQuestions(
    rate: Partial<Rate> & { id: string },
    partial?: Partial<RateRevision>
): Rate {
    const rateID = rate.id
    const rateRev = (): RateRevision => {
        return {
            id: '1234',
            rateID: rateID,
            createdAt: new Date('01/01/2023'),
            updatedAt: new Date('01/01/2023'),
            __typename: 'RateRevision',
            unlockInfo: null,
            submitInfo: {
                __typename: 'UpdateInformation',
                updatedAt: '2024-12-18T16:54:39.173Z',
                updatedBy: {
                    email: 'example@state.com',
                    role: 'STATE_USER',
                    givenName: 'John',
                    familyName: 'Vila',
                },
                updatedReason: 'contract submit',
            },
            formData: {
                __typename: 'RateFormData',
                rateCertificationName: 'rate cert',
                rateType: 'AMENDMENT',
                rateCapitationType: 'RATE_CELL',
                rateDocuments: [
                    {
                        __typename: 'GenericDocument',
                        id: 'rate',
                        s3URL: 's3://bucketname/key/rate',
                        sha256: 'fakesha',
                        name: 'rate',
                        dateAdded: new Date('01/01/2023'),
                        downloadURL: s3DlUrl,
                    },
                ],
                supportingDocuments: [
                    {
                        __typename: 'GenericDocument',
                        id: 'rate supporting 1',
                        s3URL: 's3://bucketname/key/rateSupporting1',
                        sha256: 'fakesha',
                        name: 'rate supporting 1',
                        dateAdded: new Date('01/15/2023'),
                        downloadURL: s3DlUrl,
                    },
                    {
                        __typename: 'GenericDocument',
                        id: 'rate supporting 2',
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
                rateProgramIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
                consolidatedRateProgramIDs: [
                    'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                ],
                deprecatedRateProgramIDs: [],
                certifyingActuaryContacts: [
                    {
                        id: 'uuid1',
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                        actuarialFirmOther: null,
                    },
                ],
                addtlActuaryContacts: [
                    {
                        id: 'uuid2',
                        actuarialFirm: 'DELOITTE',
                        name: 'Actuary Contact 1',
                        titleRole: 'Test Actuary Contact 1',
                        email: 'actuarycontact1@test.com',
                        actuarialFirmOther: null,
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                packagesWithSharedRateCerts: [],
            },
            ...partial,
        }
    }

    return {
        status: rate.status ?? 'SUBMITTED',
        __typename: 'Rate',
        reviewStatus: 'UNDER_REVIEW',
        consolidatedStatus: 'SUBMITTED',
        reviewStatusActions: [],
        createdAt: rate.createdAt ?? new Date(),
        updatedAt: rate.updatedAt ?? new Date(),
        webURL: `https://testmcreview.example/rate/${rateID}`,
        stateCode: rate.stateCode ?? 'MN',
        state: rate.state ?? mockMNState(),
        stateNumber: rate.stateNumber ?? 5,
        parentContractID: rate.parentContractID ?? 'parent-contract-id',
        initiallySubmittedAt:
            rate.initiallySubmittedAt ?? '2024-12-18T16:54:39.173Z',
        revisions: [rateRev()],
        draftRevision: null,
        withdrawnFromContracts: [],
        packageSubmissions: [
            {
                cause: 'RATE_SUBMISSION',
                __typename: 'RatePackageSubmission',
                submitInfo: {
                    updatedAt: '2024-12-18T16:54:39.173Z',
                    updatedBy: {
                        email: 'example@state.com',
                        role: 'STATE_USER',
                        givenName: 'John',
                        familyName: 'Vila',
                    },
                    updatedReason: 'contract submit',
                },
                submittedRevisions: [],
                contractRevisions: [
                    {
                        __typename: 'ContractRevision',
                        contractName: 'MCR-MN-0005-SNBC',
                        createdAt: new Date('01/01/2024'),
                        updatedAt: '2024-12-18T16:54:39.173Z',
                        id: '123',
                        contractID: 'test-abc-123',
                        submitInfo: {
                            updatedAt: new Date(),
                            updatedBy: {
                                email: 'example@state.com',
                                role: 'STATE_USER',
                                givenName: 'John',
                                familyName: 'Vila',
                            },
                            updatedReason: 'contract submit',
                        },
                        unlockInfo: null,
                        formData: {
                            __typename: 'ContractFormData',
                            programIDs: [
                                'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                            ],
                            populationCovered: 'MEDICAID',
                            submissionType: 'CONTRACT_AND_RATES',
                            riskBasedContract: true,
                            submissionDescription: 'A real submission',
                            supportingDocuments: [
                                {
                                    __typename: 'GenericDocument',
                                    id: 'contractSupporting1',
                                    s3URL: 's3://bucketname/key/contractsupporting1',
                                    sha256: 'fakesha',
                                    name: 'contractSupporting1',
                                    dateAdded: new Date('01/15/2024'),
                                    downloadURL: s3DlUrl,
                                },
                                {
                                    __typename: 'GenericDocument',
                                    id: 'contractSupporting2',
                                    s3URL: 's3://bucketname/key/contractSupporting2',
                                    sha256: 'fakesha',
                                    name: 'contractSupporting2',
                                    dateAdded: new Date('01/13/2024'),
                                    downloadURL: s3DlUrl,
                                },
                            ],
                            stateContacts: [],
                            contractType: 'AMENDMENT',
                            contractExecutionStatus: 'EXECUTED',
                            contractDocuments: [
                                {
                                    __typename: 'GenericDocument',
                                    id: 'contract',
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
                ],
                rateRevision: rateRev(),
            },
        ],
        questions: rate.questions ?? {
            __typename: 'IndexRateQuestionsPayload',
            DMCOQuestions: {
                __typename: 'RateQuestionList',
                totalCount: 2,
                edges: [
                    {
                        __typename: 'RateQuestionEdge' as const,
                        node: {
                            __typename: 'RateQuestion' as const,
                            id: 'dmco-question-2-id',
                            rateID,
                            createdAt: new Date('2022-12-18'),
                            addedBy: mockValidCMSUser() as CmsUser,
                            documents: [
                                {
                                    s3URL: 's3://bucketname/key/dmco-question-2-document-1',
                                    name: 'dmco-question-2-document-1',
                                    downloadURL: expect.any(String),
                                },
                                {
                                    s3URL: 's3://bucketname/key/question-2-document-2',
                                    name: 'dmco-question-2-document-2',
                                    downloadURL: expect.any(String),
                                },
                            ],
                            division: 'DMCO',
                            round: 2,
                            responses: [
                                {
                                    __typename: 'QuestionResponse',
                                    id: 'response-to-dmco-2-id',
                                    questionID: 'dmco-question-2-id',
                                    addedBy: mockValidUser() as StateUser,
                                    createdAt: new Date('2022-12-20'),
                                    documents: [
                                        {
                                            s3URL: 's3://bucketname/key/response-to-dmco-2-document-1',
                                            name: 'response-to-dmco-2-document-1',
                                            downloadURL: expect.any(String),
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        __typename: 'RateQuestionEdge',
                        node: {
                            __typename: 'RateQuestion',
                            id: 'dmco-question-1-id',
                            rateID,
                            createdAt: new Date('2022-12-15'),
                            addedBy: mockValidCMSUser() as CmsUser,
                            documents: [
                                {
                                    s3URL: 's3://bucketname/key/dmco-question-1-document-1',
                                    name: 'dmco-question-1-document-1',
                                    downloadURL: expect.any(String),
                                },
                            ],
                            round: 1,
                            division: 'DMCO',
                            responses: [],
                        },
                    },
                ],
            },
            DMCPQuestions: {
                __typename: 'RateQuestionList',
                totalCount: 1,
                edges: [
                    {
                        __typename: 'RateQuestionEdge' as const,
                        node: {
                            __typename: 'RateQuestion' as const,
                            id: 'dmcp-question-1-id',
                            rateID,
                            createdAt: new Date('2022-12-15'),
                            addedBy: mockValidCMSUser({
                                divisionAssignment: 'DMCP',
                            }) as CmsUser,
                            documents: [
                                {
                                    s3URL: 's3://bucketname/key/dmcp-question-1-document-1',
                                    name: 'dmcp-question-1-document-1',
                                    downloadURL: expect.any(String),
                                },
                            ],
                            division: 'DMCP',
                            round: 1,
                            responses: [
                                {
                                    __typename: 'QuestionResponse' as const,
                                    id: 'response-to-dmcp-1-id',
                                    questionID: 'dmcp-question-1-id',
                                    addedBy: mockValidUser() as StateUser,
                                    createdAt: new Date('2022-12-16'),
                                    documents: [
                                        {
                                            s3URL: 's3://bucketname/key/response-to-dmcp-1-document-1',
                                            name: 'response-to-dmcp-1-document-1',
                                            downloadURL: expect.any(String),
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
            OACTQuestions: {
                __typename: 'RateQuestionList',
                totalCount: 1,
                edges: [
                    {
                        __typename: 'RateQuestionEdge' as const,
                        node: {
                            __typename: 'RateQuestion' as const,
                            id: 'oact-question-2-id',
                            rateID,
                            createdAt: new Date('2022-12-17'),
                            addedBy: mockValidCMSUser({
                                divisionAssignment: 'OACT',
                            }) as CmsUser,
                            documents: [
                                {
                                    s3URL: 's3://bucketname/key/oact-question-1-document-1',
                                    name: 'oact-question-2-document-1',
                                    downloadURL: expect.any(String),
                                },
                            ],
                            division: 'OACT',
                            round: 2,
                            responses: [
                                {
                                    __typename: 'QuestionResponse' as const,
                                    id: 'response-to-oact-2-id',
                                    questionID: 'oact-question-2-id',
                                    addedBy: mockValidUser() as StateUser,
                                    createdAt: new Date('2022-12-16'),
                                    documents: [
                                        {
                                            s3URL: 's3://bucketname/key/response-to-oact-1-document-1',
                                            name: 'response-to-oact-2-document-1',
                                            downloadURL: expect.any(String),
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        __typename: 'RateQuestionEdge' as const,
                        node: {
                            __typename: 'RateQuestion' as const,
                            id: 'oact-question-1-id',
                            rateID,
                            createdAt: new Date('2022-12-16'),
                            addedBy: mockValidCMSUser({
                                divisionAssignment: 'OACT',
                            }) as CmsUser,
                            documents: [
                                {
                                    s3URL: 's3://bucketname/key/oact-question-1-document-1',
                                    name: 'oact-question-1-document-1',
                                    downloadURL: expect.any(String),
                                },
                            ],
                            division: 'OACT',

                            round: 1,
                            responses: [
                                {
                                    __typename: 'QuestionResponse' as const,
                                    id: 'response-to-oact-1-id',
                                    questionID: 'oact-question-1-id',
                                    addedBy: mockValidUser() as StateUser,
                                    createdAt: new Date('2022-12-16'),
                                    documents: [
                                        {
                                            s3URL: 's3://bucketname/key/response-to-oact-1-document-1',
                                            name: 'response-to-oact-1-document-1',
                                            downloadURL: expect.any(String),
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                ],
            },
        },
        ...rate
    }
}

export {
    rateDataMock,
    rateRevisionDataMock,
    draftRateDataMock,
    rateWithHistoryMock,
    rateUnlockedWithHistoryMock,
    submittedLinkedRatesScenarioMock,
    mockRateSubmittedWithQuestions,
    strippedRateDataMock
}
