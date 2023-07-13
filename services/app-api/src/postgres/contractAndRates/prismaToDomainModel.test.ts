import {
    contractFormDataToDomainModel,
    getContractStatus,
} from './prismaToDomainModel'
import {
    ContractRevisionFormDataType,
    ContractRevisionTableWithRelations,
} from '../prismaTypes'
import { v4 as uuidv4 } from 'uuid'

describe('prismaToDomainModel', () => {
    describe('contractFormDataToDomainModel', () => {
        it('correctly adds document categories to each document', () => {
            const contractRevision: ContractRevisionFormDataType = {
                id: 'revisionID',
                contractID: 'contractID',
                submitInfoID: 'submitInfoID',
                unlockInfoID: 'unlockInfoID',
                createdAt: new Date(),
                updatedAt: new Date(),
                programIDs: ['Program'],
                populationCovered: 'MEDICAID' as const,
                submissionType: 'CONTRACT_ONLY' as const,
                riskBasedContract: false,
                submissionDescription: 'Test',
                stateContacts: [],
                addtlActuaryContacts: [],
                addtlActuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                supportingDocuments: [
                    {
                        id: 'contractSupportingDocID',
                        contractRevisionID: 'contractRevisionID',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        name: 'contract supporting doc',
                        s3URL: 'fakeS3URL',
                        sha256: '2342fwlkdmwvw',
                    },
                    {
                        id: 'contractSupportingDocID2',
                        contractRevisionID: 'contractRevisionID',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        name: 'contract supporting doc 2',
                        s3URL: 'fakeS3URL',
                        sha256: '45662342fwlkdmwvw',
                    },
                ],
                contractType: 'BASE',
                contractExecutionStatus: 'EXECUTED',
                contractDocuments: [
                    {
                        id: 'contractDocID',
                        contractRevisionID: 'contractRevisionID',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        name: 'contract doc',
                        s3URL: 'fakeS3URL',
                        sha256: '8984234fwlkdmwvw',
                    },
                ],
                contractDateStart: new Date(Date.UTC(2025, 5, 1)),
                contractDateEnd: new Date(Date.UTC(2026, 4, 30)),
                managedCareEntities: ['MCO'],
                federalAuthorities: ['STATE_PLAN' as const],
                modifiedBenefitsProvided: false,
                modifiedGeoAreaServed: false,
                modifiedMedicaidBeneficiaries: false,
                modifiedRiskSharingStrategy: false,
                modifiedIncentiveArrangements: false,
                modifiedWitholdAgreements: false,
                modifiedStateDirectedPayments: false,
                modifiedPassThroughPayments: false,
                modifiedPaymentsForMentalDiseaseInstitutions: false,
                modifiedMedicalLossRatioStandards: false,
                modifiedOtherFinancialPaymentIncentive: false,
                modifiedEnrollmentProcess: false,
                modifiedGrevienceAndAppeal: false,
                modifiedNetworkAdequacyStandards: true,
                modifiedLengthOfContract: true,
                modifiedNonRiskPaymentArrangements: null,
                inLieuServicesAndSettings: null,
            }

            const domainFormData =
                contractFormDataToDomainModel(contractRevision)

            expect(domainFormData).toEqual(
                expect.objectContaining({
                    supportingDocuments: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'contract supporting doc',
                            s3URL: 'fakeS3URL',
                            sha256: '2342fwlkdmwvw',
                            documentCategories: expect.arrayContaining([
                                'CONTRACT_RELATED',
                            ]),
                        }),
                        expect.objectContaining({
                            name: 'contract supporting doc 2',
                            s3URL: 'fakeS3URL',
                            sha256: '45662342fwlkdmwvw',
                            documentCategories: expect.arrayContaining([
                                'CONTRACT_RELATED',
                            ]),
                        }),
                    ]),
                    contractDocuments: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'contract doc',
                            s3URL: 'fakeS3URL',
                            sha256: '8984234fwlkdmwvw',
                            documentCategories: expect.arrayContaining([
                                'CONTRACT',
                            ]),
                        }),
                    ]),
                })
            )
        })
    })

    describe('getContractStatus', () => {
        const contractWithUnorderedRevs: {
            revision: Pick<
                ContractRevisionTableWithRelations,
                'createdAt' | 'submitInfo'
            >[]
            testDescription: string
            expectedResult: 'SUBMITTED' | 'DRAFT'
        }[] = [
            {
                revision: [
                    {
                        createdAt: new Date(21, 2, 1),
                        submitInfo: undefined,
                    },
                    {
                        createdAt: new Date(21, 3, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'submit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    },
                    {
                        createdAt: new Date(21, 1, 1),
                        submitInfo: undefined,
                    },
                ],
                testDescription: 'latest revision has been submitted',
                expectedResult: 'SUBMITTED',
            },
            {
                revision: [
                    {
                        createdAt: new Date(21, 2, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'submit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    },
                    {
                        createdAt: new Date(21, 3, 1),
                        submitInfo: undefined,
                    },
                    {
                        createdAt: new Date(21, 1, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'submit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    },
                ],
                testDescription: 'latest revisions has not been submitted',
                expectedResult: 'DRAFT',
            },
        ]
        test.each(contractWithUnorderedRevs)(
            'getContractStatus correctly gets status when $testDescription',
            ({ revision, expectedResult }) => {
                expect(getContractStatus(revision)).toEqual(expectedResult)
            }
        )
    })
})
