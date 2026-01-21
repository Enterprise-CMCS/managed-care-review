import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import { SubmissionTypeSummarySection } from './SubmissionTypeSummarySection'
import {
    mockContractPackageDraft,
    mockContractPackageSubmitted,
    fetchCurrentUserMock,
    mockValidStateUser,
    mockContractPackageUnlockedWithUnlockedType,
} from '@mc-review/mocks'

describe('SubmissionTypeSummarySection', () => {
    afterEach(() => {
        vi.clearAllMocks()
    })

    it('can render draft package without errors', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={mockContractPackageDraft()}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
                isStateUser={true}
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
                name: 'MN-PMAP-0001',
            })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'Edit MN-PMAP-0001' })
        ).toHaveAttribute('href', '/submission-type')

        // Our mocks use the latest package data by default.
        // Therefore we can check here that missing field is not being displayed unexpectedly
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
    })

    it('can render submitted package without errors', async () => {
        const stateSubmission = mockContractPackageSubmitted()
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={stateSubmission}
                submissionName="MN-MSHO-0003"
                isStateUser={true}
                initiallySubmittedAt={stateSubmission.initiallySubmittedAt}
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
                name: 'MN-MSHO-0003',
            })
        ).toBeInTheDocument()
        expect(screen.queryByRole('link', { name: 'Edit' })).toBeNull()
        // We should never display missing field text on submission summary for submitted packages
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
        // API returns UTC timezone, we display timestamped dates in PT timezone so 1 day before on these tests.
        expect(screen.getByLabelText('Submitted')).toHaveTextContent(
            '11/26/2024'
        )
    })

    it('renders expected fields for draft package on review and submit', async () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={mockContractPackageDraft()}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
                isStateUser={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.getByRole('definition', { name: 'Program(s)' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: /Is this a risk based contract/,
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Submission type' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Contract action type' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Submission description',
                })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: /Which populations does this contract action cover\?/,
                })
            ).toBeInTheDocument()
        })
    })

    it('renders missing field message for population coverage question when expected', () => {
        const draftContract = mockContractPackageDraft()
        if (!draftContract.draftRevision)
            throw Error('Unexpected error: no draftRevision')
        draftContract.draftRevision.formData.populationCovered = undefined
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={draftContract}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
                isStateUser={true}
                explainMissingData
            />
        )
        expect(
            screen.getByRole('definition', {
                name: /Which populations does this contract action cover\?/,
            })
        ).toBeInTheDocument()
        const riskBasedDefinitionParentDiv = screen.getByRole('definition', {
            name: /Which populations does this contract action cover\?/,
        })
        if (!riskBasedDefinitionParentDiv) throw Error('Testing error')
        expect(riskBasedDefinitionParentDiv).toHaveTextContent(
            /You must provide this information/
        )
    })

    it('renders missing field message for risk based contract when expected', async () => {
        const draftContract = mockContractPackageDraft()
        if (!draftContract.draftRevision)
            throw Error('Unexpected error: no draftRevision')
        draftContract.draftRevision.formData.riskBasedContract = undefined
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={draftContract}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
                isStateUser={true}
                explainMissingData
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.getByRole('definition', { name: 'Program(s)' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: /Is this a risk based contract/,
                })
            ).toBeInTheDocument()
            const riskBasedDefinitionParentDiv = screen.getByRole(
                'definition',
                {
                    name: /Is this a risk based contract/,
                }
            )
            if (!riskBasedDefinitionParentDiv) throw Error('Testing error')
            expect(riskBasedDefinitionParentDiv).toHaveTextContent(
                /You must provide this information/
            )
        })
    })

    it('renders expected fields for submitted package on submission summary', async () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={mockContractPackageSubmitted({
                    status: 'RESUBMITTED',
                })}
                editNavigateTo="submission-type"
                submissionName="MN-MSHO-0003"
                initiallySubmittedAt={new Date('2023-01-02')}
                isStateUser={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.getByRole('definition', { name: 'Submitted' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Program(s)' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Submission type' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Submission description',
                })
            ).toBeInTheDocument()
            expect(
                screen.queryByRole('definition', { name: 'Submitted' })
            ).toBeInTheDocument()
        })
    })

    it('renders expected fields for resubmitted package on submission summary', async () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={mockContractPackageSubmitted({
                    status: 'RESUBMITTED',
                })}
                editNavigateTo="submission-type"
                submissionName="MN-MSHO-0003"
                initiallySubmittedAt={new Date('2023-01-02')}
                isStateUser={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.getByRole('definition', { name: 'Submitted' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Program(s)' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Submission type' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Submission description',
                })
            ).toBeInTheDocument()
        })
    })

    it('renders expected fields for unlocked package on submission summary for CMS users', async () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={mockContractPackageUnlockedWithUnlockedType()}
                editNavigateTo="submission-type"
                submissionName="MN-MSHO-0003"
                initiallySubmittedAt={new Date('2023-01-02')}
                isStateUser={false}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.getByRole('definition', { name: 'Submitted' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Program(s)' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Submission type' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Submission description',
                })
            ).toBeInTheDocument()
        })
    })

    it('renders expected fields for unlocked package on submission summary for state users', async () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={mockContractPackageUnlockedWithUnlockedType()}
                editNavigateTo="submission-type"
                submissionName="MN-MSHO-0003"
                isStateUser={true}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => {
            expect(
                screen.queryByRole('definition', { name: 'Submitted' })
            ).not.toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Program(s)' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', { name: 'Submission type' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('definition', {
                    name: 'Submission description',
                })
            ).toBeInTheDocument()
        })
    })

    it('does not render Submitted at field', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={mockContractPackageDraft()}
                editNavigateTo="submission-type"
                submissionName="MN-PMAP-0001"
                isStateUser={true}
            />
        )
        expect(
            screen.queryByRole('definition', { name: 'Submitted' })
        ).not.toBeInTheDocument()
    })

    it('renders headerChildComponent component', () => {
        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={mockContractPackageDraft()}
                editNavigateTo="submission-type"
                headerChildComponent={<button>Test button</button>}
                submissionName="MN-PMAP-0001"
                isStateUser={true}
            />
        )
        expect(
            screen.queryByRole('button', { name: 'Test button' })
        ).toBeInTheDocument()
    })

    it('does not render fields with missing fields for submitted package on submission summary', () => {
        const stateSubmission = mockContractPackageSubmitted()
        const submittedPackage = stateSubmission.packageSubmissions[0]
        submittedPackage.contractRevision.formData = {
            ...submittedPackage.contractRevision.formData,
            submissionDescription: '',
            programIDs: [],
        }
        stateSubmission.packageSubmissions[0] = submittedPackage

        renderWithProviders(
            <SubmissionTypeSummarySection
                contract={{ ...stateSubmission, status: 'SUBMITTED' }}
                editNavigateTo="submission-type"
                submissionName="MN-MSHO-0003"
                isStateUser={true}
            />
        )
        expect(
            screen.queryByRole('definition', { name: 'Program(s)' })
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole('definition', { name: 'Submission description' })
        ).not.toBeInTheDocument()
    })
})
