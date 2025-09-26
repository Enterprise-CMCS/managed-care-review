import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    mockContract,
    mockContractRev,
    mockMNState,
    mockRate,
    testEmailConfig,
    testStateAnalystsEmails,
} from '../../testHelpers/emailerHelpers'
import { sendUndoWithdrawnRateCMSEmail } from './sendUndoWithdrawnRateCMSEmail'
import type { RateType } from '../../domain-models'
import { mockRateRevision } from '../../testHelpers'

const testRate = mockRate({
    id: 'test-rate',
    createdAt: new Date('2025-03-05'),
    updatedAt: new Date('2025-03-05'),
    status: 'RESUBMITTED',
    reviewStatus: 'UNDER_REVIEW',
    consolidatedStatus: 'RESUBMITTED',
    parentContractID: 'parent-contract',
    withdrawnFromContracts: [],
    packageSubmissions: [
        {
            submitInfo: {
                updatedAt: new Date('2025-03-05'),
                updatedReason: 'Messed up - undoing withdraw',
                updatedBy: testStateUser({
                    email: 'undoer-of-withdraws@example.com',
                }),
            },
            submittedRevisions: [],
            rateRevision: {
                id: 'test-rate-revision',
                rateID: 'test-rate',
                submitInfo: {
                    updatedAt: new Date('2025-03-05'),
                    updatedReason: 'Messed up - undoing withdraw',
                    updatedBy: testCMSUser({
                        email: 'undoer-of-withdraws@example.com',
                    }),
                },
                createdAt: new Date('2025-03-05'),
                updatedAt: new Date('2025-03-05'),
                formData: {
                    rateType: 'NEW',
                    rateCapitationType: 'RATE_CELL',
                    rateDateStart: new Date('2025-03-05'),
                    rateDateEnd: new Date('2025-03-05'),
                    rateDateCertified: new Date('2025-03-05'),
                    rateCertificationName: 'test-rate-certification-name',
                    rateID: 'rate-id',
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
            contractRevisions: [
                mockContractRev({
                    submitInfo: {
                        updatedAt: new Date('2025-03-05'),
                        updatedReason: 'Messed up - undoing withdraw',
                        updatedBy: testCMSUser({
                            email: 'undoer-of-withdraws@example.com',
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
            ],
        },
    ],
    reviewStatusActions: [
        {
            rateID: 'test-rate',
            updatedBy: testCMSUser(),
            updatedReason: 'I am undoing a withdraw',
            actionType: 'UNDER_REVIEW',
            updatedAt: new Date('2025-03-05'),
        },
    ],
})

const statePrograms = mockMNState().programs
const stateAnalystEmails = () => [...testStateAnalystsEmails]

describe('sendUndoWithdrawnRateCMSEmail', () => {
    it('renders CMS for unwithdrawn rate as expected', async () => {
        const template = await sendUndoWithdrawnRateCMSEmail(
            testRate,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.toAddresses).toEqual(
            expect.arrayContaining([
                ...stateAnalystEmails(),
                ...testEmailConfig().dmcpSubmissionEmails,
                ...testEmailConfig().oactEmails,
            ])
        )
    })

    it('renders overall email for a withdrawn rate as expected', async () => {
        const template = await sendUndoWithdrawnRateCMSEmail(
            testRate,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        if (template instanceof Error) {
            throw template
        }

        expect(template.bodyHTML).toMatchSnapshot()
    })
})

describe('sendUndoWithdrawnRateCMSEmail error handling', () => {
    it('returns an error if rate consolidatedStatus is not RESUBMITTED', async () => {
        const rateWithWrongStatus = {
            ...testRate,
            consolidatedStatus: 'WITHDRAWN' as const,
        }
        const template = await sendUndoWithdrawnRateCMSEmail(
            rateWithWrongStatus,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Rate consolidated status should be RESUBMITTED'
        )
    })

    it('returns an error if the withdrawnFromContracts array was not emptied', async () => {
        const rateWithWrongStatus = {
            ...testRate,
            withdrawnFromContracts: [
                {
                    ...mockContract({
                        id: 'parent-contract',
                        stateNumber: 100,
                        packageSubmissions: [
                            {
                                submitInfo: {
                                    updatedAt: new Date('2025-03-05'),
                                    updatedReason:
                                        'Messed up - undoing withdraw',
                                    updatedBy: testCMSUser({
                                        email: 'undoer-of-withdraws@example.com',
                                    }),
                                },
                                submittedRevisions: [],
                                rateRevisions: [],
                                contractRevision: mockContractRev({
                                    submitInfo: {
                                        updatedAt: new Date('2025-03-05'),
                                        updatedReason:
                                            'Messed up - undoing withdraw',
                                        updatedBy: testCMSUser({
                                            email: 'undoer-of-withdraws@example.com',
                                        }),
                                    },
                                }),
                            },
                        ],
                    }),
                },
            ],
        }

        const template = await sendUndoWithdrawnRateCMSEmail(
            rateWithWrongStatus,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'withdrawnFromContracts should be empty'
        )
    })

    it('returns an error if there are no review status actions present', async () => {
        const missingReviewStatusActions = {
            ...testRate,
            reviewStatusActions: [],
        }

        const template = await sendUndoWithdrawnRateCMSEmail(
            missingReviewStatusActions,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Rate does not have any review status actions'
        )
    })

    it('returns an error if the latest review action is NOT "UNDER_REVIEW"', async () => {
        const rateWithWrongActionType = {
            ...testRate,
            reviewStatusActions: [
                {
                    rateID: 'test-rate',
                    updatedBy: testCMSUser(),
                    updatedReason: 'I must withdraw',
                    actionType: 'WITHDRAW' as const,
                    updatedAt: new Date('2025-03-10'),
                },
                {
                    rateID: 'test-rate',
                    updatedBy: testCMSUser(),
                    updatedReason: 'Test under review',
                    actionType: 'UNDER_REVIEW' as const,
                    updatedAt: new Date('2025-03-05'),
                },
                {
                    rateID: 'test-rate',
                    updatedBy: testCMSUser(),
                    updatedReason: 'Test withdraw',
                    actionType: 'WITHDRAW' as const,
                    updatedAt: new Date('2025-03-15'),
                },
            ],
        }

        const template = await sendUndoWithdrawnRateCMSEmail(
            rateWithWrongActionType,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Latest rate review action is not UNDER_REVIEW'
        )
    })

    it('returns an error if there is no rateCertificationName', async () => {
        const rateWithoutRateCertificationName: RateType = {
            ...testRate,
            packageSubmissions: [
                {
                    ...testRate.packageSubmissions[0],
                    rateRevision: {
                        ...mockRateRevision(),
                        id: 'test-rate-revision',
                        rateID: 'test-rate',
                        submitInfo: {
                            updatedAt: new Date('2025-03-05'),
                            updatedReason: 'Messed up - undoing withdraw',
                            updatedBy: testCMSUser({
                                email: 'undoer-of-withdraws@example.com',
                            }),
                        },
                        unlockInfo: undefined,
                        createdAt: new Date('2025-03-05'),
                        updatedAt: new Date('2025-03-05'),
                        formData: {
                            rateType: 'NEW',
                            rateCapitationType: 'RATE_CELL',
                            rateDateStart: new Date('2025-03-05'),
                            rateDateEnd: new Date('2025-03-05'),
                            rateDateCertified: new Date('2025-03-05'),
                            rateCertificationName: '',
                            rateID: 'test-rate',
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
                },
            ],
        }

        const template = await sendUndoWithdrawnRateCMSEmail(
            rateWithoutRateCertificationName,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Error parsing for rateCertificationName'
        )
    })

    it('returns an error if there is no rateID', async () => {
        const rateWithoutRateID: RateType = {
            ...testRate,
            packageSubmissions: [
                {
                    ...testRate.packageSubmissions[0],
                    rateRevision: {
                        id: 'test-rate-revision',
                        rateID: 'test-rate',
                        submitInfo: {
                            updatedAt: new Date('2025-03-05'),
                            updatedReason: 'Messed up - undoing withdraw',
                            updatedBy: testCMSUser({
                                email: 'undoer-of-withdraws@example.com',
                            }),
                        },
                        createdAt: new Date('2025-03-05'),
                        updatedAt: new Date('2025-03-05'),
                        formData: {
                            rateType: 'NEW',
                            rateCapitationType: 'RATE_CELL',
                            rateDateStart: new Date('2025-03-05'),
                            rateDateEnd: new Date('2025-03-05'),
                            rateDateCertified: new Date('2025-03-05'),
                            rateCertificationName: 'test-rate',
                            rateID: '',
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
                },
            ],
        }

        const template = await sendUndoWithdrawnRateCMSEmail(
            rateWithoutRateID,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe('Error parsing for rateID')
    })

    it('returns an error if there are no contractRevisions', async () => {
        const rateWithoutContractRevisions: RateType = {
            ...testRate,
            packageSubmissions: [
                {
                    ...testRate.packageSubmissions[0],
                    rateRevision: {
                        id: 'test-rate-revision',
                        rateID: 'test-rate',
                        submitInfo: {
                            updatedAt: new Date('2025-03-05'),
                            updatedReason: 'Messed up - undoing withdraw',
                            updatedBy: testCMSUser({
                                email: 'undoer-of-withdraws@example.com',
                            }),
                        },
                        createdAt: new Date('2025-03-05'),
                        updatedAt: new Date('2025-03-05'),
                        formData: {
                            rateType: 'NEW',
                            rateCapitationType: 'RATE_CELL',
                            rateDateStart: new Date('2025-03-05'),
                            rateDateEnd: new Date('2025-03-05'),
                            rateDateCertified: new Date('2025-03-05'),
                            rateCertificationName:
                                'test-rate-certification-name',
                            rateID: 'test-rate-id',
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
        }

        const template = await sendUndoWithdrawnRateCMSEmail(
            rateWithoutContractRevisions,
            statePrograms,
            stateAnalystEmails(),
            testEmailConfig()
        )

        expect(template).toBeInstanceOf(Error)
        expect((template as Error).message).toBe(
            'Rate does not have any contract revisions'
        )
    })
})
