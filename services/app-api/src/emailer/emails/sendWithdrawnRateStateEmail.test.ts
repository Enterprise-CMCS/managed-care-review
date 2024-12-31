import { consoleLogFullData, mockRateRevision } from "../../testHelpers";
import { mockContract, mockContractRev, mockMNState, mockRate, testEmailConfig } from "../../testHelpers/emailerHelpers";
import { testCMSUser, testStateUser } from "../../testHelpers/userHelpers";
import { sendWithdrawnRateStateEmail } from "./sendWithdrawnRateStateEmail";

const testRate = mockRate({
    id: 'test-rate',
    createdAt: new Date('2024-04-12'),
    updatedAt: new Date('2024-04-12'),
    status: 'RESUBMITTED',
    reviewStatus: 'WITHDRAWN',
    consolidatedStatus: 'WITHDRAWN',
    parentContractID: 'parent-contract',
    withdrawnFromContracts: [
        {
            ...mockContract({
                id: 'parent-contract',
                stateNumber: 100,
                packageSubmissions: [
                    {
                        submitInfo: {
                            updatedAt: new Date('2024-04-12'),
                            updatedReason: 'CMS withdrew rate',
                            updatedBy: testStateUser({
                                email: 'cms@cms.com',
                            }),
                        },
                        submittedRevisions: [],
                        rateRevisions: [],
                        contractRevision: mockContractRev({
                            submitInfo: {
                                updatedAt: new Date('2024-04-12'),
                                updatedReason: 'CMS withdrew rate',
                                updatedBy: testCMSUser({
                                    email: 'cms@cms.com',
                                }),
                            },
                            formData: {
                                ...mockContractRev().formData,
                                stateContacts: [
                                {
                                    name: 'parent-contract-state-contact',
                                    titleRole: 'state contact',
                                    email: 'parent-contract-state-contact@state.com',
                                }
                            ],
                            }
                            
                        })
                    }
                ]
            })
        },
        {
            ...mockContract({
                id: 'linked-contract',
                stateNumber: 222,
                packageSubmissions: [
                    {
                        submitInfo: {
                            updatedAt: new Date('2024-04-12'),
                            updatedReason: 'CMS withdrew rate',
                            updatedBy: testCMSUser({
                                email: 'cms@cms.com',
                            }),
                        },
                        submittedRevisions: [],
                        rateRevisions: [],
                        contractRevision: mockContractRev({
                            submitInfo: {
                                updatedAt: new Date('2024-04-12'),
                                updatedReason: 'CMS withdrew rate',
                                updatedBy: testCMSUser({
                                    email: 'cms@cms.com',
                                }),
                            },
                            formData: {
                                ...mockContractRev().formData,
                                stateContacts: [
                                {
                                    name: 'linked-contract-state-contact',
                                    titleRole: 'state contact',
                                    email: 'linked-contract-state-contact@state.com',
                                },
                                {
                                    name: 'duplicate-state-contact',
                                    titleRole: 'state contact',
                                    email: 'duplicateContact@state-contact.com',
                                },
                                {
                                    name: 'duplicate-state-contact',
                                    titleRole: 'state contact',
                                    email: 'duplicateContact@state-contact.com',
                                },
                            ],
                            }
                            
                        })
                    }
                ]
            })
        },
    ],
    packageSubmissions: [
        {
            submitInfo: {
                updatedAt: new Date('2024-04-12'),
                updatedReason: 'CMS withdrawn this rate',
                updatedBy: testStateUser({
                    email: 'parent-contract-submitter@state.com',
                }),
            },
            submittedRevisions: [],
            rateRevision:  {
                id: 'test-rate-revision',
                rateID: 'test-rate',
                submitInfo: {
                    updatedAt: new Date('2024-04-12'),
                    updatedReason: 'CMS withdrawn this rate',
                    updatedBy: testStateUser({
                        email: 'parent-contract-submitter@state.com',
                    }),
                },
                createdAt: new Date('2024-04-12'),
                updatedAt: new Date('2024-04-12'),
                formData: {
                    rateType: 'NEW',
                    rateCapitationType: 'RATE_CELL',
                    rateDateStart: new Date('2024-01-01'),
                    rateDateEnd: new Date('2025-01-01'),
                    rateDateCertified: new Date('2024-01-02'),
                    rateCertificationName: 'test-rate-certification-name',
                    rateProgramIDs: [mockMNState().programs[0].id],
                    rateDocuments: [
                        {
                            s3URL: 's3://bucketname/key/test1',
                            name: 'ratedoc1.doc',
                            sha256: 'foobar',
                        },
                    ],
                    supportingDocuments: [],
                    certifyingActuaryContacts: [
                        {
                            name: 'Foo Person',
                            titleRole: 'Bar Job',
                            email: 'certifyingActuary@example.com',
                            actuarialFirm: 'GUIDEHOUSE',
                        },
                    ],
                    addtlActuaryContacts: [
                        {
                            name: 'Bar Person',
                            titleRole: 'Baz Job',
                            email: 'addtlActuaryContacts@example.com',
                            actuarialFirm: 'OTHER',
                            actuarialFirmOther: 'Some Firm',
                        },
                    ],
                    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
                },
            },
            contractRevisions: []
        },
    ],
    reviewStatusActions: [
        {
            rateID: 'test-rate',
            updatedBy: testCMSUser(),
            updatedReason: 'Test withdraw',
            actionType: 'WITHDRAW',
            updatedAt: new Date('2024-04-12'),
        },
    ],
})

const statePrograms = mockMNState().programs

describe('sendWithdrawnRateStateEmail', () => {
    it('includes expected state contacts in toAddress', async () => {
        const template = await sendWithdrawnRateStateEmail(
            testEmailConfig(),
            testRate,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        console.log(template.bodyHTML)

        expect(template.toAddresses).toEqual(
            expect.arrayContaining([
                'parent-contract-state-contact@state.com',
                'linked-contract-state-contact@state.com',
                'duplicateContact@state-contact.com',
                'devreview1@example.com',
                'devreview2@example.com'
            ])
        )
    })

    it('renders withdrawn rate with single withdrawn from contract as expected', async () => {
        const singleContractRate = {
            ...testRate,
            withdrawnFromContracts: [
                {
                    ...mockContract({
                        id: 'parent-contract',
                        stateNumber: 100,
                        packageSubmissions: [
                            {
                                submitInfo: {
                                    updatedAt: new Date('2024-04-12'),
                                    updatedReason: 'CMS withdrew rate',
                                    updatedBy: testStateUser({
                                        email: 'cms@cms.com',
                                    }),
                                },
                                submittedRevisions: [],
                                rateRevisions: [],
                                contractRevision: mockContractRev({
                                    submitInfo: {
                                        updatedAt: new Date('2024-04-12'),
                                        updatedReason: 'CMS withdrew rate',
                                        updatedBy: testCMSUser({
                                            email: 'cms@cms.com',
                                        }),
                                    },
                                    formData: {
                                        ...mockContractRev().formData,
                                        stateContacts: [
                                        {
                                            name: 'parent-contract-state-contact',
                                            titleRole: 'state contact',
                                            email: 'parent-contract-state-contact@state.com',
                                        }
                                    ],
                                    }
                                    
                                })
                            }
                        ]
                    })
                },
            ],
        }
        const template = await sendWithdrawnRateStateEmail(
            testEmailConfig(),
            singleContractRate,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        console.log(template.bodyHTML)

        // does not contain a ul element
        expect(template.bodyHTML).not.toEqual(expect.stringContaining('<ul>'));

        // expect single contract name
        expect(template.bodyHTML).toEqual(expect.stringContaining('MCR-MN-0100-SNBC'));

        // expect View the submission link
        expect(template.bodyHTML).toEqual(expect.stringContaining('<a href="http://localhost/submissions/parent-contract">View the submission in MC-Review</a>'));
    })

    it('renders overall email for a withdrawn rate as expected', async () => {
        const template = await sendWithdrawnRateStateEmail(
            testEmailConfig(),
            testRate,
            statePrograms
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })
})

describe('sendWithdrawnRateStateEmail error handling', () => {
    it('returns an error if rate consolidatedStatus is not WITHDRAWN', async () => {
        const rateWithBadStatus = {
            ...testRate,
            consolidatedStatus: 'SUBMITTED' as const
        }
        const template = await sendWithdrawnRateStateEmail(
            testEmailConfig(),
            rateWithBadStatus,
            statePrograms
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toEqual('Rate consolidated status is not WITHDRAWN')
    })
    it('returns an error if no reviewStatusActions are present', async () => {
        const rateWithoutActions = {
            ...testRate,
            reviewStatusActions: []
        }
        const template = await sendWithdrawnRateStateEmail(
            testEmailConfig(),
            rateWithoutActions,
            statePrograms
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toEqual('Rate does not any have review actions')
    })
    it('returns an error if latest reviewStatusActions action was not withdraw action', async () => {
        const rateWithoutActions = {
            ...testRate,
            reviewStatusActions: [
                {
                    rateID: 'test-rate',
                    updatedBy: testCMSUser(),
                    updatedReason: 'Test under review',
                    actionType: 'UNDER_REVIEW' as const,
                    updatedAt: new Date('2024-04-11'),
                },
                {
                    rateID: 'test-rate',
                    updatedBy: testCMSUser(),
                    updatedReason: 'Test under review',
                    actionType: 'UNDER_REVIEW' as const,
                    updatedAt: new Date('2024-04-15'),
                },
                {
                    rateID: 'test-rate',
                    updatedBy: testCMSUser(),
                    updatedReason: 'Test withdraw',
                    actionType: 'WITHDRAW' as const,
                    updatedAt: new Date('2024-04-12'),
                }
            ]
        }
        const template = await sendWithdrawnRateStateEmail(
            testEmailConfig(),
            rateWithoutActions,
            statePrograms
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toEqual('Rate latest review action was not a withdraw action')
    })
    it('returns an error when parsing withdrawn from contract data fails', async () => {
        const rateWithBadContractData = {
            ...testRate
        }

        if (!rateWithBadContractData.withdrawnFromContracts?.[0]) {
            throw new Error('Expected rate to have withdrawn from contracts')
        }

        rateWithBadContractData.withdrawnFromContracts[0].packageSubmissions[0].contractRevision.formData.programIDs = ['bad-program-id']
    
        const template = await sendWithdrawnRateStateEmail(
            testEmailConfig(),
            rateWithBadContractData,
            statePrograms
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toEqual("Error parsing withdrawn from contract data for contract with ID: parent-contract. Can't find programs bad-program-id from state MN")
    })
    it('returns an error when rate has no withdrawn from contracts', async () => {
        const rateWithoutContracts = {
            ...testRate,
            withdrawnFromContracts: []
        }
        const template = await sendWithdrawnRateStateEmail(
            testEmailConfig(),
            rateWithoutContracts,
            statePrograms
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toEqual('Rate was withdrawn, but was not associated with any contracts')
    })
})