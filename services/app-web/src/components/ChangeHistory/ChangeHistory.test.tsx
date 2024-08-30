import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangeHistory } from './ChangeHistoryV2'
import {
    fetchCurrentUserMock,
    mockContractPackageSubmitted,
    mockContractPackageSubmittedWithRevisions,
    mockContractPackageUnlocked,
    mockContractRevision,
    mockRateRevision,
    mockValidCMSUser,
    mockValidStateUser,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import dayjs from 'dayjs'

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
            <ChangeHistory contract={mockContractPackageUnlocked()} />,
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
        expect(
            screen.getByRole('button', {
                name: `${dayjs(
                    submittedContract.packageSubmissions[0].submitInfo.updatedAt
                )
                    .tz('America/New_York')
                    .format('MM/DD/YY h:mma')} ET - Submission`,
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
        expect(
            screen.getByRole('button', {
                name: `${dayjs(
                    submittedContract.packageSubmissions[0].submitInfo.updatedAt
                )
                    .tz('America/New_York')
                    .format('MM/DD/YY h:mma')} ET - Submission`,
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
        expect(accordionRows[0]).toHaveTextContent(
            `${dayjs(
                submittedContract.packageSubmissions[0].submitInfo.updatedAt
            )
                .tz('America/New_York')
                .format('MM/DD/YY h:mma')} ET - Submission`
        )
        expect(accordionRows[1]).toHaveTextContent(
            `${dayjs(
                submittedContract.packageSubmissions[0].contractRevision
                    .unlockInfo?.updatedAt
            )
                .tz('America/New_York')
                .format('MM/DD/YY h:mma')} ET - Unlock`
        )
        expect(accordionRows[2]).toHaveTextContent(
            `${dayjs(
                submittedContract.packageSubmissions[1].submitInfo.updatedAt
            )
                .tz('America/New_York')
                .format('MM/DD/YY h:mma')} ET - Submission`
        )
        expect(accordionRows[3]).toHaveTextContent(
            `${dayjs(
                submittedContract.packageSubmissions[1].contractRevision
                    .unlockInfo?.updatedAt
            )
                .tz('America/New_York')
                .format('MM/DD/YY h:mma')} ET - Unlock`
        )
        expect(accordionRows[4]).toHaveTextContent(
            `${dayjs(
                submittedContract.packageSubmissions[2].submitInfo.updatedAt
            )
                .tz('America/New_York')
                .format('MM/DD/YY h:mma')} ET - Submission`
        )
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
        const submittedContract = mockContractPackageUnlocked()
        renderWithProviders(<ChangeHistory contract={submittedContract} />)
        //Initial submission should not have a link
        expect(
            screen.getByTestId(
                `accordionItem_${submittedContract.packageSubmissions[0].submitInfo.updatedAt}`
            )
        ).not.toHaveTextContent('View past submission version')
    })
})
