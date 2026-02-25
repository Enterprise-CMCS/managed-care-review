import { screen, waitFor } from '@testing-library/react'
import {
    generatePath,
    Location,
    Route,
    Routes,
    NavigateFunction,
} from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import {
    ContractSubmissionTypeRecord,
    RoutesRecord,
} from '@mc-review/constants'
import { fetchCurrentUserMock, s3DlUrl } from '@mc-review/mocks'
import {
    mockContractPackageSubmitted,
    mockValidCMSUser,
    updateContractDraftRevisionMockSuccess,
} from '@mc-review/mocks'
import {
    fetchContractMockSuccess,
    fetchContractMockFail,
    mockContractPackageDraft,
    updateContractDraftRevisionMockFail,
    mockContractPackageUnlockedWithUnlockedType,
    fetchContractWithQuestionsMockSuccess,
} from '@mc-review/mocks'
// some spies will not work with indexed exports, so I refactored to import them directly from their files
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { StateSubmissionForm } from './StateSubmissionForm'
import { testS3Client } from '../../testHelpers/s3Helpers'
import { getYesNoFieldValue } from '../../testHelpers/fieldHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { GenericDocument } from '../../gen/gqlClient'

describe('StateSubmissionForm', () => {
    describe('loads draft submission', () => {
        it('redirects user to submission summary page when status is submitted', async () => {
            const contract = mockContractPackageSubmitted()
            let testLocation: Location
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...contract,
                                    id: '15',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[contract.contractSubmissionType]}/15/edit/type`,
                    },
                    location: (location) => (testLocation = location),
                }
            )

            await waitFor(() => {
                expect(testLocation.pathname).toBe(
                    generatePath(RoutesRecord.SUBMISSIONS_SUMMARY, {
                        id: '15',
                        contractSubmissionType: 'HEALTH_PLAN',
                    })
                )
            })
        })

        it('loads submission type fields for /submissions/edit/type', async () => {
            const mockDraft = mockContractPackageUnlockedWithUnlockedType()
            mockDraft.draftRevision.formData.submissionDescription =
                'A real submission'
            mockDraft.draftRevision.formData.submissionType = 'CONTRACT_ONLY'
            mockDraft.draftRevision.formData.submissionDescription =
                'A real submission'
            mockDraft.draftRevision.formData.programIDs = [
                'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
            ]

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockDraft,
                                    id: '15',
                                },
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockDraft,
                                    id: '15',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockDraft.contractSubmissionType]}/15/edit/type`,
                    },
                }
            )

            const description = await screen.findByLabelText(
                'Submission description'
            )
            expect(description).toBeInTheDocument()
            expect(description.textContent).toBe('A real submission')

            expect(
                await screen.findByLabelText('Contract action only')
            ).toBeChecked()

            // in react-select, only items that are selected have a "remove item" label
            await waitFor(() => {
                expect(screen.getByLabelText('Remove SNBC')).toBeInTheDocument()
            })
        })

        it('loads documents fields for /submissions/:id/edit/contract-details', async () => {
            const mockContract = mockContractPackageDraft()
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockContract,
                                    id: '12',
                                },
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContract,
                                    id: '12',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockContract.contractSubmissionType]}/12/edit/contract-details`,
                    },
                    featureFlags: {
                        'hide-supporting-docs-page': true,
                    },
                }
            )
            await screen.findByText('Contract Details')

            expect(
                screen.getByLabelText('Upload contract-supporting documents')
            ).toBeInTheDocument()
            expect(screen.getAllByTestId('file-input')).toHaveLength(2)
        })

        it('renders 404 page when using wrong url parameter for contract type', async () => {
            let testNavigate: NavigateFunction
            let testLocation: Location

            const mockContract = mockContractPackageDraft()
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockContract,
                                    id: '12',
                                },
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContract,
                                    id: '12',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/health-plan/12/edit/type`,
                    },
                    featureFlags: {
                        'hide-supporting-docs-page': true,
                    },
                    navigate: (nav) => (testNavigate = nav),
                    location: (location) => (testLocation = location),
                }
            )

            // sanity check for valid url
            await waitFor(() => {
                expect(
                    screen.getByText(
                        'Which populations does this contract action cover?'
                    )
                ).toBeInTheDocument()
            })

            //check submission details page
            await waitFor(() => {
                testNavigate('/submissions/eqro/12/edit/type')
            })

            await waitFor(() => {
                expect(testLocation.pathname).toBe(
                    '/submissions/eqro/12/edit/type'
                )
                expect(
                    screen.getByText('404 / Page not found')
                ).toBeInTheDocument()
            })

            //check contract details page
            await waitFor(() => {
                testNavigate('/submissions/eqro/12/edit/contract-details')
            })

            await waitFor(() => {
                expect(testLocation.pathname).toBe(
                    '/submissions/eqro/12/edit/contract-details'
                )
                expect(
                    screen.getByText('404 / Page not found')
                ).toBeInTheDocument()
            })

            //check contacts page
            await waitFor(() => {
                testNavigate('/submissions/eqro/12/edit/contacts')
            })

            await waitFor(() => {
                expect(testLocation.pathname).toBe(
                    '/submissions/eqro/12/edit/contacts'
                )
                expect(
                    screen.getByText('404 / Page not found')
                ).toBeInTheDocument()
            })

            //check review and submit page
            await waitFor(() => {
                testNavigate('/submissions/eqro/12/edit/review-and-submit')
            })

            await waitFor(() => {
                expect(testLocation.pathname).toBe(
                    '/submissions/eqro/12/edit/review-and-submit'
                )
                expect(
                    screen.getByText('404 / Page not found')
                ).toBeInTheDocument()
            })
        })
    })

    describe('loads unlocked submission', () => {
        it('displays unlock banner with correct data for an unlocked submission', async () => {
            const mockContract = mockContractPackageUnlockedWithUnlockedType()
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockContract,
                                    id: '15',
                                },
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContract,
                                    id: '15',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockContract.contractSubmissionType]}/15/edit/review-and-submit`,
                    },
                }
            )

            const banner = await screen.findByTestId('unlockedBanner')
            expect(banner).toBeInTheDocument()
            expect(banner).toHaveClass('usa-alert--info')
            expect(banner).toHaveTextContent(
                /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+\s[a-zA-Z]+/i
            )
            expect(banner).toHaveTextContent(
                'Unlocked by: cms@example.comUnlocked'
            )
            expect(banner).toHaveTextContent(
                'Reason for unlock: unlocked for a test'
            )
        })
    })

    describe('when user edits submission', () => {
        it('change draft submission description and navigate to contract details', async () => {
            const mockSubmission = mockContractPackageDraft()
            mockSubmission.draftRevision!.formData.submissionDescription =
                'A real submission but updated something'

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            updateContractDraftRevisionMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockSubmission.contractSubmissionType]}/15/edit/type`,
                    },
                }
            )

            await waitFor(() =>
                expect(
                    screen.getByRole('form', { name: 'Submission Type Form' })
                ).toBeInTheDocument()
            )
            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            await userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
        })

        it('works even if other sections of the form have been filled out', async () => {
            const mockDocs: GenericDocument[] = [
                {
                    __typename: 'GenericDocument',
                    id: 'somedoc-id',
                    name: 'somedoc.pdf',
                    s3URL: 's3://bucketName/key/somedoc.pdf',
                    sha256: 'fakesha',
                    dateAdded: new Date(),
                    downloadURL: s3DlUrl,
                },
            ]
            const mockSubmission = mockContractPackageDraft()
            mockSubmission.draftRevision!.formData.contractDocuments = mockDocs

            const updatedSubmission = mockContractPackageDraft()
            updatedSubmission.draftRevision!.formData.submissionDescription =
                'A real submission but updated something'

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            updateContractDraftRevisionMockSuccess({
                                contract: {
                                    ...updatedSubmission,
                                    id: '15',
                                },
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockSubmission.contractSubmissionType]}/15/edit/type`,
                    },
                }
            )
            await waitFor(() =>
                expect(
                    screen.getByRole('form', { name: 'Submission Type Form' })
                ).toBeInTheDocument()
            )

            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            await userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            continueButton.click()
        })
    })

    describe('errors', () => {
        it('shows a generic error fetching submission fails at submission type', async () => {
            const mockSubmission = mockContractPackageDraft()
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                            fetchContractMockFail({
                                id: '15',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockSubmission.contractSubmissionType]}/15/edit/type`,
                    },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })

        it('shows a generic error fetching submission fails at contract details', async () => {
            const mockSubmission = mockContractPackageDraft()
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockFail({
                                id: '15',
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockSubmission.contractSubmissionType]}/15/edit/contract-details`,
                    },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })

        it('shows a generic error when updating submission fails', async () => {
            const mockSubmission = mockContractPackageDraft()
            mockSubmission.draftRevision!.formData.submissionDescription =
                'A real submission but updated something'
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                            updateContractDraftRevisionMockFail({
                                contract: { id: '15' },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockSubmission.contractSubmissionType]}/15/edit/type`,
                    },
                }
            )

            await waitFor(() =>
                expect(
                    screen.getByRole('form', { name: 'Submission Type Form' })
                ).toBeInTheDocument()
            )
            const textarea = await screen.findByRole('textbox', {
                name: 'Submission description',
            })
            await userEvent.type(textarea, ' but updated something')

            const continueButton = await screen.findByRole('button', {
                name: 'Continue',
            })
            expect(continueButton).toBeInTheDocument()
            await continueButton.click()

            await waitFor(() => {
                expect(screen.getByText('System error')).toBeInTheDocument()
            })
        })

        it('shows a generic 404 page when package is not found', async () => {
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({}),
                            fetchContractMockFail({
                                id: '404',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/health-plan/404/edit/type',
                    },
                }
            )

            const notFound = await screen.findByText('System error')
            expect(notFound).toBeInTheDocument()
        })
    })

    describe('the delete button', () => {
        const mockS3 = testS3Client()

        it('does not delete files from past revisions', async () => {
            const mockSubmission = mockContractPackageUnlockedWithUnlockedType()

            const docs: GenericDocument[] = [
                {
                    __typename: 'GenericDocument',
                    id: 'doc-1',
                    s3URL: 's3://bucketname/one-two/one-two.png',
                    sha256: 'fakesha',
                    name: 'one two',
                    dateAdded: new Date(),
                    downloadURL: s3DlUrl,
                },
                {
                    __typename: 'GenericDocument',
                    id: 'doc-2',
                    s3URL: 's3://bucketname/two-one/two-one.png',
                    sha256: 'fakesha',
                    name: 'two one',
                    dateAdded: new Date(),
                    downloadURL: s3DlUrl,
                },
                {
                    __typename: 'GenericDocument',
                    id: 'doc-3',
                    s3URL: 's3://bucketname/three-one/three-one.png',
                    sha256: 'fakesha',
                    name: 'three one',
                    dateAdded: new Date(),
                    downloadURL: s3DlUrl,
                },
            ]

            mockSubmission.draftRevision!.formData.contractDocuments = docs
            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '15',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockSubmission.contractSubmissionType]}/15/edit/contract-details`,
                    },
                    featureFlags: {
                        'hide-supporting-docs-page': true,
                    },
                    s3Provider: mockS3,
                }
            )
            await screen.findByText('Contract Details')

            // PERFORM

            // We should be able to find delete buttons for each of the three recent files.
            // the aria label for each button is a lifesaver here.
            const removeOneTwo = await screen.findByLabelText(
                'Remove one two document'
            )
            const removeTwoOne = await screen.findByLabelText(
                'Remove two one document'
            )
            const removeThreeOne = await screen.findByLabelText(
                'Remove three one document'
            )
            await userEvent.click(removeOneTwo)
            await userEvent.click(removeTwoOne)
            await userEvent.click(removeThreeOne)

            // ASSERT
            // Verify these files are no longer visible in the UI
            expect(
                screen.queryByText('Remove one two document')
            ).not.toBeInTheDocument()
            expect(
                screen.queryByText('Remove two one document')
            ).not.toBeInTheDocument()
            expect(
                screen.queryByText('Remove three one document')
            ).not.toBeInTheDocument()

            expect(screen.getAllByText(/0 files added/)).toHaveLength(2)
        })

        it('loads contract details fields for /submissions/health-plan/:id/edit/contract-details with amendments', async () => {
            const mockSubmission = mockContractPackageDraft()

            renderWithProviders(
                <Routes>
                    <Route element={<SubmissionSideNav />}>
                        <Route
                            path={RoutesRecord.SUBMISSIONS_EDIT_TOP_LEVEL}
                            element={<StateSubmissionForm />}
                        />
                    </Route>
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchContractWithQuestionsMockSuccess({
                                contract: {
                                    ...mockSubmission,
                                    id: '12',
                                },
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: '12',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `/submissions/${ContractSubmissionTypeRecord[mockSubmission.contractSubmissionType]}/12/edit/contract-details`,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    getYesNoFieldValue(
                        'Benefits provided by the managed care plans'
                    )
                ).toBe(true)
                expect(
                    getYesNoFieldValue(
                        'Geographic areas served by the managed care plans'
                    )
                ).toBe(false)
            })
        })
    })
})
