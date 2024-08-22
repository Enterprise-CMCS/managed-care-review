import { screen, waitFor } from '@testing-library/react'
import { generatePath, Location, Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { SubmissionDocument } from '../../common-code/healthPlanFormDataType'
import { RoutesRecord } from '../../constants/routes'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks/userGQLMock'
import {
    mockDraftHealthPlanPackage,
    mockSubmittedHealthPlanPackage,
    mockUnlockedHealthPlanPackage,
    mockUnlockedHealthPlanPackageWithDocuments,
} from '../../testHelpers/apolloMocks/healthPlanFormDataMock'
import {
    fetchContractMockSuccess,
    fetchContractMockFail,
    mockContractPackageDraft,
    updateContractDraftRevisionMockFail,
    mockContractPackageUnlockedWithUnlockedType,
} from '../../testHelpers/apolloMocks'
import {
    fetchHealthPlanPackageMockSuccess,
    fetchHealthPlanPackageMockNetworkFailure,
    fetchHealthPlanPackageMockAuthFailure,
    updateHealthPlanFormDataMockSuccess,
} from '../../testHelpers/apolloMocks/healthPlanPackageGQLMock'
// some spies will not work with indexed exports, so I refactored to import them directly from their files
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import * as useContractForm from '../../hooks/useContractForm'

import { StateSubmissionForm } from './StateSubmissionForm'
import {
    base64ToDomain,
    domainToBase64,
} from '../../common-code/proto/healthPlanFormDataProto'
import { testS3Client } from '../../testHelpers/s3Helpers'
import { getYesNoFieldValue } from '../../testHelpers/fieldHelpers'
import { SubmissionSideNav } from '../SubmissionSideNav'
import { fetchStateHealthPlanPackageWithQuestionsMockSuccess } from '../../testHelpers/apolloMocks'
const mockUpdateDraftFn = vi.fn()

describe('StateSubmissionForm', () => {
    beforeEach(() => {
        vi.spyOn(useContractForm, 'useContractForm').mockReturnValue({
            updateDraft: mockUpdateDraftFn,
            createDraft: vi.fn(),
            showPageErrorMessage: false,
            draftSubmission: mockContractPackageUnlockedWithUnlockedType(),
        })
    })
    afterEach(() => {
        vi.clearAllMocks()
        vi.spyOn(useContractForm, 'useContractForm').mockRestore()
    })
    describe('loads draft submission', () => {
        it('redirects user to submission summary page when status is submitted', async () => {
            const mockSubmission = mockSubmittedHealthPlanPackage()
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
                            fetchCurrentUserMock({ statusCode: 200 }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    stateSubmission: mockSubmission,
                                    id: '15',
                                }
                            ),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
                    location: (location) => (testLocation = location),
                }
            )

            await waitFor(() => {
                expect(testLocation.pathname).toBe(
                    generatePath(RoutesRecord.SUBMISSIONS_SUMMARY, { id: '15' })
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
            vi.spyOn(useContractForm, 'useContractForm').mockReturnValue({
                updateDraft: mockUpdateDraftFn,
                createDraft: vi.fn(),
                showPageErrorMessage: false,
                draftSubmission: mockDraft,
            })
            const mockSubmission = mockDraftHealthPlanPackage({
                submissionDescription: 'A real submission',
                submissionType: 'CONTRACT_ONLY',
                programIDs: ['abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce'],
            })

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
                            fetchHealthPlanPackageMockSuccess({
                                id: '15',
                                submission: mockSubmission,
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    stateSubmission: mockSubmission,
                                    id: '15',
                                }
                            ),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
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

        it('loads documents fields for /submissions/:id/edit/documents', async () => {
            const mockSubmission = mockDraftHealthPlanPackage()
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
                            fetchHealthPlanPackageMockSuccess({
                                id: '12',
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '12',
                                    stateSubmission: mockSubmission,
                                }
                            ),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/12/edit/documents',
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByText('Upload contract-supporting documents')
                ).toBeInTheDocument()
                expect(screen.getByTestId('file-input')).toBeInTheDocument()
            })
        })
    })

    describe('loads unlocked submission', () => {
        it('displays unlock banner with correct data for an unlocked submission', async () => {
            const mockSubmission = mockUnlockedHealthPlanPackage()
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
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: mockSubmission,
                                }
                            ),
                            fetchHealthPlanPackageMockSuccess({
                                id: '15',
                                submission: mockSubmission,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/edit/documents',
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
                'Unlocked by: bob@dmas.mn.govUnlocked'
            )
            expect(banner).toHaveTextContent(
                'Reason for unlock: Test unlock reason'
            )
        })
    })

    describe('when user edits submission', () => {
        it('change draft submission description and navigate to contract details', async () => {
            const mockSubmission = mockDraftHealthPlanPackage({
                submissionDescription:
                    'A real submission but updated something',
            })
            const formData = base64ToDomain(
                mockSubmission.revisions[0].node.formDataProto
            )
            if (formData instanceof Error) throw Error

            formData.submissionDescription =
                'A real submission but updated something'

            const updatedFormData = domainToBase64(formData)

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
                            fetchHealthPlanPackageMockSuccess({
                                submission: mockSubmission,
                                id: '15',
                            }),
                            updateHealthPlanFormDataMockSuccess({
                                id: '15',
                                pkg: mockSubmission,
                                updatedFormData,
                            }),
                            fetchHealthPlanPackageMockSuccess({
                                id: '15',
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: '15',
                                },
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: mockSubmission,
                                }
                            ),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
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
            const mockDocs: SubmissionDocument[] = [
                {
                    name: 'somedoc.pdf',
                    s3URL: 's3://bucketName/key/somedoc.pdf',
                    sha256: 'fakesha',
                },
            ]
            const mockSubmission = mockDraftHealthPlanPackage({
                id: '15',
                documents: mockDocs,
            })

            const formData = base64ToDomain(
                mockSubmission.revisions[0].node.formDataProto
            )
            if (formData instanceof Error) throw Error

            formData.submissionDescription =
                'A real submission but updated something'

            const updatedFormData = domainToBase64(formData)

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
                            fetchHealthPlanPackageMockSuccess({
                                id: '15',
                                submission: mockSubmission,
                            }),
                            updateHealthPlanFormDataMockSuccess({
                                id: '15',
                                pkg: mockSubmission,
                                updatedFormData,
                            }),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: '15',
                                },
                            }),
                            fetchHealthPlanPackageMockSuccess({
                                id: '15',
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: mockSubmission,
                                }
                            ),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
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
            vi.spyOn(useContractForm, 'useContractForm').mockReturnValue({
                updateDraft: mockUpdateDraftFn,
                createDraft: vi.fn(),
                showPageErrorMessage: true,
                draftSubmission: undefined,
            })

            const mockSubmission = mockDraftHealthPlanPackage()
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
                            // fetchHealthPlanPackageMockAuthFailure(),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: mockSubmission,
                                }
                            ),
                            fetchContractMockFail({
                                id: '15',
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })

        it('shows a generic error fetching submission fails at contract details', async () => {
            vi.spyOn(useContractForm, 'useContractForm').mockReturnValue({
                updateDraft: mockUpdateDraftFn,
                createDraft: vi.fn(),
                showPageErrorMessage: true,
                draftSubmission: undefined,
            })

            const mockSubmission = mockDraftHealthPlanPackage()
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
                            fetchHealthPlanPackageMockNetworkFailure(),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: mockSubmission,
                                }
                            ),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15/edit/contract-details',
                    },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })

        it('shows a generic error fetching submission fails at documents', async () => {
            const mockSubmission = mockDraftHealthPlanPackage()
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
                            fetchHealthPlanPackageMockAuthFailure(),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: mockSubmission,
                                }
                            ),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/documents' },
                }
            )

            const loading = await screen.findByText('System error')
            expect(loading).toBeInTheDocument()
        })

        it('shows a generic error when updating submission fails', async () => {
            const mockSubmission = mockDraftHealthPlanPackage({
                submissionDescription:
                    'A real submission but updated something',
            })

            vi.spyOn(useContractForm, 'useContractForm').mockReturnValue({
                updateDraft: mockUpdateDraftFn,
                createDraft: vi.fn(),
                showPageErrorMessage: true,
                draftSubmission: undefined,
            })

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
                            fetchHealthPlanPackageMockSuccess({
                                submission: mockSubmission,
                                id: '15',
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: mockSubmission,
                                }
                            ),
                            updateContractDraftRevisionMockFail({
                                contract: { id: '15' },
                            }),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/type' },
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
                    routerProvider: { route: '/submissions/404/edit/type' },
                }
            )

            const notFound = await screen.findByText('System error')
            expect(notFound).toBeInTheDocument()
        })
    })

    describe('the delete button', () => {
        // For this test, we want to mock the call to deleteFile to see when it gets called
        const mockS3 = testS3Client()
        const deleteCallKeys: string[] = []
        mockS3.deleteFile = async (key) => {
            deleteCallKeys.push(key)
        }

        it('does not delete files from past revisions', async () => {
            const submission = mockUnlockedHealthPlanPackageWithDocuments()
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
                            fetchHealthPlanPackageMockSuccess({
                                id: '15',
                                submission,
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    id: '15',
                                    stateSubmission: submission,
                                }
                            ),
                        ],
                    },
                    routerProvider: { route: '/submissions/15/edit/documents' },
                    s3Provider: mockS3,
                }
            )

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
            // When deleting a file that exists in a previous revision, we should not see its key
            // in the deleteCallKeys array.
            expect(deleteCallKeys).toEqual(['three-one'])
        })

        it('loads contract details fields for /submissions/:id/edit/contract-details with amendments', async () => {
            const mockSubmission = mockDraftHealthPlanPackage()

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
                            fetchHealthPlanPackageMockSuccess({
                                id: '12',
                                submission: mockSubmission,
                            }),
                            fetchStateHealthPlanPackageWithQuestionsMockSuccess(
                                {
                                    stateSubmission: mockSubmission,
                                    id: '12',
                                }
                            ),
                            fetchContractMockSuccess({
                                contract: {
                                    ...mockContractPackageDraft(),
                                    id: '12',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/12/edit/contract-details',
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
