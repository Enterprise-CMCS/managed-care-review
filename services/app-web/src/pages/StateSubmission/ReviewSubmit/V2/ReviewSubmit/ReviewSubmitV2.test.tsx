import { screen, waitFor, within } from '@testing-library/react'
import {
    renderWithProviders,
    userClickByRole,
} from '../../../../../testHelpers/jestHelpers'
import { ReviewSubmitV2 } from './ReviewSubmitV2'
import {
    fetchCurrentUserMock,
    fetchContractMockSuccess,
    mockContractPackageUnlocked,
} from '../../../../../testHelpers/apolloMocks'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../../../../constants'

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
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
                featureFlags: {
                    'link-rates': true,
                },
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
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
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
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: {
                                id: 'test-abc-123',
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
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
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: { id: 'test-abc-123' },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
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

    it('extracts the correct dates from unlocked submission and displays them in tables', async () => {
        const contractMock = fetchContractMockSuccess({
            contract: mockContractPackageUnlocked(),
        })

        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
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
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        await waitFor(() => {
            const contractDocRow = screen.getByRole('row', {
                name: /contract document/,
            })
            expect(
                within(contractDocRow).getByText('1/1/24')
            ).toBeInTheDocument()
            const contractSupporting1Row = screen.getByRole('row', {
                name: /contractSupporting1/,
            })
            expect(
                within(contractSupporting1Row).getByText('1/15/24')
            ).toBeInTheDocument()
            const rateDocRow = screen.getByRole('row', {
                name: /rate certification/,
            })
            expect(within(rateDocRow).getByText('1/13/24')).toBeInTheDocument()
            const rateSupporting1Row = screen.getByRole('row', {
                name: /rateSupporting1/,
            })
            expect(
                within(rateSupporting1Row).getByText('1/15/24')
            ).toBeInTheDocument()
        })
    })

    it('displays back, save as draft, and submit buttons', async () => {
        renderWithProviders(
            <Routes>
                <Route
                    path={RoutesRecord.SUBMISSIONS_REVIEW_SUBMIT}
                    element={<ReviewSubmitV2 />}
                />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        fetchContractMockSuccess({
                            contract: { id: 'test-abc-123' },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            }
        )

        await screen.findByRole('button', {
            name: 'Back',
        })

        await screen.findByRole('button', {
            name: 'Save as draft',
        })

        expect(screen.getByTestId('form-submit')).toBeDefined()
        expect(screen.getByText('Submit')).toBeInTheDocument()
        await userClickByRole(screen, 'button', { name: 'Submit' })
    })
})
