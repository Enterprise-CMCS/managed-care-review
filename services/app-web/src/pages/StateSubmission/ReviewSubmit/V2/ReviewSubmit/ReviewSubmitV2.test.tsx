import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../../../testHelpers/jestHelpers'
import { ReviewSubmitV2 } from './ReviewSubmitV2'
import { 
    fetchCurrentUserMock,
    fetchContractMockSuccess,
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
                        fetchContractMockSuccess({
                            contract: {
                            id: 'test-abc-123',
                            }
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', { name: 'Contract details' })
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
                            }
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            })

        await waitFor(() => {
            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
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
                            }
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            })

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
                            contract: {id: 'test-abc-123' }
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/test-abc-123/edit/review-and-submit',
                },
                featureFlags: {
                    'link-rates': true,
                },
            })

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
            screen.debug()
            const submissionDescription =
                screen.queryByText('A real submission')
            expect(submissionDescription).toBeInTheDocument()
        })
    })

    it.skip('displays back and save as draft buttons', async () => {
        renderWithProviders(<ReviewSubmitV2 />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'Back',
                })
            ).toBeDefined()
        )
        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'Save as draft',
                })
            ).toBeDefined()
        )
    })

    it.skip('displays submit button', async () => {
        renderWithProviders(<ReviewSubmitV2 />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(screen.getByTestId('form-submit')).toBeDefined()
        )
    })
})