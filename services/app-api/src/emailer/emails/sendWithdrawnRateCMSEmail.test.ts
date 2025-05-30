import {
    mockContract,
    mockContractRev,
    mockMNState,
    mockRate,
    testEmailConfig,
    testStateAnalystsEmails,
} from '../../testHelpers/emailerHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import { sendWithdrawnRateCMSEmail } from './sendWithdrawnRateCMSEmail'

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
                                    },
                                ],
                            },
                        }),
                    },
                ],
            }),
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
                            },
                        }),
                    },
                ],
            }),
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
            rateRevision: {
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
            contractRevisions: [],
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

const stateAnalystsEmails = () => [...testStateAnalystsEmails]

describe('sendWithdrawnRateCMSEmail', () => {
    it('includes expected CMS contacts in toAddress', async () => {
        const template = await sendWithdrawnRateCMSEmail(
            testEmailConfig(),
            testRate,
            statePrograms,
            stateAnalystsEmails()
        )

        if (template instanceof Error) {
            throw template
        }

        // Expect state analysts, DMCP submission emails, and OACT emails
        expect(template.toAddresses).toEqual(
            expect.arrayContaining([
                ...stateAnalystsEmails(),
                ...testEmailConfig().dmcpSubmissionEmails,
                ...testEmailConfig().oactEmails,
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
                                            },
                                        ],
                                    },
                                }),
                            },
                        ],
                    }),
                },
            ],
        }
        const template = await sendWithdrawnRateCMSEmail(
            testEmailConfig(),
            singleContractRate,
            statePrograms,
            stateAnalystsEmails()
        )

        if (template instanceof Error) {
            throw template
        }

        // does not contain a ul element
        expect(template.bodyHTML).not.toEqual(expect.stringContaining('<ul>'))

        // expect single contract name
        expect(template.bodyHTML).toEqual(
            expect.stringContaining('MCR-MN-0100-SNBC')
        )

        // expect View the submission link
        expect(template.bodyHTML).toEqual(
            expect.stringContaining(
                '<a href="http://localhost/rates/test-rate">View withdrawn rate in MC-Review</a>'
            )
        )
    })

    it('renders email correctly for withdrawn orphan rates', async () => {
        // orphan rates have no contract associations in withdrawnFromContracts and latest submission
        const orphanRate = {
            ...testRate,
            withdrawnFromContracts: [],
            packageSubmissions: [
                {
                    ...testRate.packageSubmissions[0],
                    contractRevisions: [],
                },
            ],
        }

        const template = await sendWithdrawnRateCMSEmail(
            testEmailConfig(),
            orphanRate,
            statePrograms,
            stateAnalystsEmails()
        )

        if (template instanceof Error) {
            throw template
        }

        // expect single contract name
        expect(template.bodyHTML).toEqual(
            expect.not.stringContaining('MCR-MN-0100-SNBC')
        )

        // expect View the submission link
        expect(template.bodyHTML).toEqual(
            expect.not.stringContaining('Withdrawn from:')
        )

        // expect View the submission link
        expect(template.bodyHTML).toEqual(
            expect.stringContaining(
                '<a href="http://localhost/rates/test-rate">View withdrawn rate in MC-Review</a>'
            )
        )
    })

    it('renders overall email for a withdrawn rate as expected', async () => {
        const template = await sendWithdrawnRateCMSEmail(
            testEmailConfig(),
            testRate,
            statePrograms,
            stateAnalystsEmails()
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
            consolidatedStatus: 'SUBMITTED' as const,
        }
        const template = await sendWithdrawnRateCMSEmail(
            testEmailConfig(),
            rateWithBadStatus,
            statePrograms,
            stateAnalystsEmails()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Rate consolidated status is not WITHDRAWN'
        )
    })
    it('returns an error if no reviewStatusActions are present', async () => {
        const rateWithoutActions = {
            ...testRate,
            reviewStatusActions: [],
        }
        const template = await sendWithdrawnRateCMSEmail(
            testEmailConfig(),
            rateWithoutActions,
            statePrograms,
            stateAnalystsEmails()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Rate does not have any review actions'
        )
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
                },
            ],
        }
        const template = await sendWithdrawnRateCMSEmail(
            testEmailConfig(),
            rateWithoutActions,
            statePrograms,
            stateAnalystsEmails()
        )
        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Rate latest review action was not a withdraw action'
        )
    })
    it('returns an error when parsing withdrawn from contract data fails', async () => {
        const rateWithBadContractData = {
            ...testRate,
        }

        if (!rateWithBadContractData.withdrawnFromContracts?.[0]) {
            throw new Error('Expected rate to have withdrawn from contracts')
        }

        rateWithBadContractData.withdrawnFromContracts[0].packageSubmissions[0].contractRevision.formData.programIDs =
            ['bad-program-id']

        const template = await sendWithdrawnRateCMSEmail(
            testEmailConfig(),
            rateWithBadContractData,
            statePrograms,
            stateAnalystsEmails()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            "Error parsing withdrawn from contract data for contract with ID: parent-contract. Can't find programs bad-program-id from state MN"
        )
    })
})
