import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangeHistory } from './ChangeHistoryV2'
import {
    fetchCurrentUserMock,
    mockContractPackageSubmitted,
    mockContractPackageSubmittedWithRevisions,
    mockContractPackageUnlockedWithUnlockedType,
    mockContractRevision,
    mockRateRevision,
    mockValidCMSUser,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers'

describe('Change History', () => {
    it('can render history for initial submission', () => {
        const submittedContract = mockContractPackageSubmitted()
        renderWithProviders(<ChangeHistory contract={submittedContract} />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                ],
            },
        })

        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Change history',
            })
        ).toBeInTheDocument()

        expect(screen.getByText(`contract submit`)).toBeInTheDocument()
    })

    it('can render change history for unlocked submission', () => {
        renderWithProviders(
            <ChangeHistory
                contract={mockContractPackageUnlockedWithUnlockedType()}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        expect(
            screen.getByRole('heading', {
                level: 2,
                name: 'Change history',
            })
        ).toBeInTheDocument()

        expect(screen.getByText(`unlocked for a test`)).toBeInTheDocument()
    })

    it('has expected text in the accordion titles and content', () => {
        const submittedContract = mockContractPackageSubmittedWithRevisions()
        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        // API returns UTC timezone, we display timestamped dates in ET timezone so 1 day before on these tests.
        expect(
            screen.getByRole('button', {
                name: `03/03/2024 11:54am ET - Submission`,
            })
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                submittedContract.packageSubmissions[0].submitInfo.updatedReason
            )
        ).toBeInTheDocument()
    })

    it('has expected text in the accordion titles and content for ADMIN events', () => {
        const submittedContract = mockContractPackageSubmittedWithRevisions({
            packageSubmissions: [
                {
                    __typename: 'ContractPackageSubmission',
                    cause: 'CONTRACT_SUBMISSION',
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2024-02-02T17:45:39.173Z',
                        updatedBy: {
                            email: 'admin@example.com',
                            role: 'ADMIN_USER',
                            givenName: 'Admin',
                            familyName: 'Admin',
                        },
                        updatedReason: 'Admin submit',
                    },
                    submittedRevisions: [mockContractRevision('2')],
                    contractRevision: mockContractRevision('2', {
                        unlockInfo: {
                            __typename: 'UpdateInformation',
                            updatedAt: '2024-01-25T21:13:56.174Z',
                            updatedBy: {
                                email: 'admin@example.com',
                                role: 'ADMIN_USER',
                                givenName: 'Admin',
                                familyName: 'Admin',
                            },
                            updatedReason: 'Admin unlock',
                        },
                    }),
                    rateRevisions: [mockRateRevision('2')],
                },
                {
                    __typename: 'ContractPackageSubmission',
                    cause: 'CONTRACT_SUBMISSION',
                    submitInfo: {
                        __typename: 'UpdateInformation',
                        updatedAt: '2024-01-01T11:14:39.173Z',
                        updatedBy: {
                            email: 'example@state.com',
                            role: 'STATE_USER',
                            givenName: 'John',
                            familyName: 'Vila',
                        },
                        updatedReason: 'submit 1',
                    },
                    submittedRevisions: [mockContractRevision('1')],
                    contractRevision: mockContractRevision('1'),
                    rateRevisions: [mockRateRevision('1')],
                },
            ],
        })

        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        // API returns UTC timezone, we display timestamped dates in ET timezone so 1 day before on these tests.
        expect(
            screen.getByRole('button', {
                name: `02/02/2024 12:45pm ET - Submission`,
            })
        ).toBeInTheDocument()
        // Should have 3 change history records
        expect(screen.getAllByTestId('change-history-record')).toHaveLength(3)
        // Two should be made by Administrator.
        expect(screen.getAllByText('Administrator')).toHaveLength(2)
        expect(
            screen.getByText(
                submittedContract.packageSubmissions[0].submitInfo.updatedReason
            )
        ).toBeInTheDocument()
    })

    it('should expand and collapse the accordion on click', async () => {
        const submittedContract = mockContractPackageSubmittedWithRevisions()
        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        // submitted reasons not visible initially, must expand
        expect(
            screen.getByText(
                submittedContract.packageSubmissions[0].submitInfo.updatedReason
            )
        ).not.toBeVisible()
        const accordionRows = screen.getAllByRole('button')
        await userEvent.click(accordionRows[0])
        expect(
            screen.getByText(
                submittedContract.packageSubmissions[0].submitInfo.updatedReason
            )
        ).toBeVisible()
        await userEvent.click(accordionRows[0])
        expect(
            screen.getByText(
                submittedContract.packageSubmissions[0].submitInfo.updatedReason
            )
        ).not.toBeVisible()
    })
    it('should list the submission events in reverse chronological order', () => {
        const submittedContract = mockContractPackageSubmittedWithRevisions()
        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        const accordionRows = screen.getAllByRole('button')
        // API returns UTC timezone, we display timestamped dates in ET timezone so 1 day before on these tests.
        expect(accordionRows[0]).toHaveTextContent('03/03/2024 11:54am ET')
        expect(accordionRows[1]).toHaveTextContent('03/01/2024 12:54pm ET')
        expect(accordionRows[2]).toHaveTextContent('02/02/2024 12:45pm ET')
        expect(accordionRows[3]).toHaveTextContent('01/25/2024 4:13pm ET')
        expect(accordionRows[4]).toHaveTextContent('01/01/2024 6:14am ET')
    })
    it('has correct href values for previous submission links', () => {
        const submittedContract = mockContractPackageSubmittedWithRevisions()
        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        expect(screen.getByTestId(`revision-link-1`)).toHaveAttribute(
            'href',
            `/submissions/${submittedContract.id}/revisions/1`
        )
        expect(screen.getByTestId(`revision-link-2`)).toHaveAttribute(
            'href',
            `/submissions/${submittedContract.id}/revisions/2`
        )
    })
    it('should list accordion items with links when appropriate', () => {
        const submittedContract = mockContractPackageSubmittedWithRevisions()
        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        //Latest resubmission should not have a link.
        expect(
            screen.getByTestId(
                `accordionItem_${submittedContract.packageSubmissions[0].submitInfo.updatedAt}`
            )
        ).not.toHaveTextContent('View past submission version')
        //Unlock history accordion should not have a link
        expect(
            screen.getByTestId(
                `accordionItem_${submittedContract.packageSubmissions[0].contractRevision.unlockInfo?.updatedAt}`
            )
        ).not.toHaveTextContent('View past submission version')
        //Previous submission should contain a link
        expect(
            screen.getByTestId(
                `accordionItem_${submittedContract.packageSubmissions[1].submitInfo.updatedAt}`
            )
        ).toHaveTextContent('View past submission version')
        //Unlock history accordion should not have a link
        expect(
            screen.getByTestId(
                `accordionItem_${submittedContract.packageSubmissions[1].contractRevision.unlockInfo?.updatedAt}`
            )
        ).not.toHaveTextContent('View past submission version')
        //Previous submission should contain a link
        expect(
            screen.getByTestId(
                `accordionItem_${submittedContract.packageSubmissions[2].submitInfo.updatedAt}`
            )
        ).toHaveTextContent('View past submission version')
    })
    it('should not list links for initial submission without revisions', () => {
        const submittedContract = mockContractPackageSubmitted()
        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        //Initial submission should not have a link
        expect(
            screen.getByTestId(
                `accordionItem_${submittedContract.packageSubmissions[0].submitInfo.updatedAt}`
            )
        ).not.toHaveTextContent('View past submission version')
    })
    it('should not list links for initial submission when initial submission is unlocked', () => {
        const submittedContract = mockContractPackageUnlockedWithUnlockedType()
        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        //Initial submission should not have a link
        expect(
            screen.getByTestId(
                `accordionItem_${submittedContract.packageSubmissions[0].submitInfo.updatedAt}`
            )
        ).not.toHaveTextContent('View past submission version')
    })
})
