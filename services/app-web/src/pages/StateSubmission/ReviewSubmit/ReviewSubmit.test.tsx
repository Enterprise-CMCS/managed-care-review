import { screen, waitFor, within } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ReviewSubmit } from './'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockValidStateUser,
} from '../../../testHelpers/apolloMocks'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../../constants'
import {
    mockContractPackageDraft,
    mockContractPackageUnlockedWithUnlockedType,
} from '../../../testHelpers/apolloMocks/contractPackageDataMock'

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({}),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'Rate details' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()
        })
    })

    it('displays edit buttons for every section', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThan(1)
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )
        })
    })

    it('does not display zip download buttons', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            const bulkDownloadButtons = screen.queryAllByRole('button', {
                name: /documents/,
            })
            expect(bulkDownloadButtons).toHaveLength(0)
        })
    })

    it('renders info from a draft contract', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()

            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )
            const submissionDescription =
                screen.queryByText('A real submission')
            expect(submissionDescription).toBeInTheDocument()
        })
    })

    it('extracts the correct document dates from unlocked submission and displays them in tables', async () => {
        const contractMock = fetchContractMockSuccess({
            contract: mockContractPackageUnlockedWithUnlockedType(),
        })

        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        contractMock,
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await waitFor(() => {
            const rows = screen.getAllByRole('row')
            expect(rows).toHaveLength(4)
            // API returns UTC timezone, we display timestamped dates in ET timezone so 1 day before on these tests.
            expect(within(rows[0]).getByText('Date added')).toBeInTheDocument()
            expect(within(rows[1]).getByText('02/01/2023')).toBeInTheDocument()
            expect(within(rows[2]).getByText('Date added')).toBeInTheDocument()
            expect(within(rows[3]).getByText('03/01/2023')).toBeInTheDocument()
        })
    })

    it('displays back, save as draft, and submit buttons', async () => {
        const { user } = renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                ...mockContractPackageDraft(),
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        await screen.findByRole('button', {
            name: 'Back',
        })

        await screen.findByRole('button', {
            name: 'Save as draft',
        })

        expect(screen.getByTestId('form-submit')).toBeDefined()
        expect(screen.getAllByText('Submit')).toHaveLength(2)
        await user.click(screen.getAllByText('Submit')[0])
    })

    it('pulls the right version of UNLOCKED data for state users', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        fetchContractMockSuccess({
                            contract:
                                mockContractPackageUnlockedWithUnlockedType(),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        const description = await screen.findByLabelText(
            'Submission description'
        )
        expect(description).toHaveTextContent('An updated submission')
        const ratingPeriod = await screen.findByLabelText(
            'Rating period of original rate certification'
        )
        expect(ratingPeriod).toHaveTextContent('02/02/2020 to 02/02/2021')
    })

    it('hides the legacy shared rates across submissions UI for state users when unlocked', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmit />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            statusCode: 200,
                            user: mockValidStateUser(),
                        }),
                        fetchContractMockSuccess({
                            contract:
                                mockContractPackageUnlockedWithUnlockedType(),
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {},
            }
        )

        expect(
            await screen.queryByText('Linked submissions')
        ).not.toBeInTheDocument()
        expect(await screen.queryByText('SHARED')).not.toBeInTheDocument()
    })
})
