import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, testS3Client } from '../../testHelpers'
import {
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    mockValidCMSUser,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { RateSummary } from './RateSummary'
import { RoutesRecord } from '../../constants'
import { Route, Routes } from 'react-router-dom'
import { RateEdit } from '../RateEdit/RateEdit'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route path={RoutesRecord.RATES_SUMMARY} element={children} />
        </Routes>
    )
}

describe('RateSummary', () => {
    describe('Viewing RateSummary as a CMS user', () => {
        it('renders without errors', async () => {
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({ id: '7a' }),
                    ],
                },
                routerProvider: {
                    route: '/rates/7a',
                },
            })

            expect(
                await screen.findByText('Rates this rate certification covers')
            ).toBeInTheDocument()
        })

        it('renders document download warning banner when download fails', async () => {
            const error = jest
                .spyOn(console, 'error')
                .mockImplementation(() => {
                    // mock expected console error to keep test output clear
                })

            const s3Provider = {
                ...testS3Client(),
                getBulkDlURL: async (
                    keys: string[],
                    fileName: string
                ): Promise<string | Error> => {
                    return new Error('Error: getBulkDlURL encountered an error')
                },
            }
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({ id: '7a' }),
                    ],
                },
                routerProvider: {
                    route: '/rates/7a',
                },
                s3Provider,
            })

            await waitFor(() => {
                expect(screen.getByTestId('warning-alert')).toBeInTheDocument()
                expect(screen.getByTestId('warning-alert')).toHaveClass(
                    'usa-alert--warning'
                )
                expect(screen.getByTestId('warning-alert')).toHaveTextContent(
                    'Document download unavailable'
                )
                expect(error).toHaveBeenCalled()
            })
        })

        it('renders back to dashboard link for CMS users', async () => {
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({ id: '7a' }),
                    ],
                },
                routerProvider: {
                    route: '/rates/7a',
                },
            })

            const backLink = await screen.findByRole('link', {
                name: /Back to dashboard/,
            })
            expect(backLink).toBeInTheDocument()

            expect(backLink).toHaveAttribute('href', '/dashboard/rate-reviews')
        })
    })

    describe('Viewing RateSummary as a State user', () => {
        it('renders SingleRateSummarySection component without errors for locked rate', async () => {
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({ id: '1337' }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337',
                },
                featureFlags: { 'rate-edit-unlock': true },
            })

            await waitFor(() => {
                expect(screen.queryByTestId('rate-summary')).toBeInTheDocument()
            })

            expect(
                await screen.findByText('Rates this rate certification covers')
            ).toBeInTheDocument()
        })

        it('redirects to RateEdit component from RateSummary without errors for unlocked rate', async () => {
            renderWithProviders(
                <Routes>
                    <Route
                        path={RoutesRecord.RATES_SUMMARY}
                        element={<RateSummary />}
                    />
                    <Route
                        path={RoutesRecord.RATE_EDIT}
                        element={<RateEdit />}
                    />
                </Routes>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidStateUser(),
                                statusCode: 200,
                            }),
                            fetchRateMockSuccess({
                                id: '1337',
                                status: 'UNLOCKED',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/rates/1337',
                    },
                    featureFlags: {
                        'rate-edit-unlock': true,
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.queryByTestId('single-rate-edit')
                ).toBeInTheDocument()
            })
        })

        it('renders expected error page when rate ID is invalid', async () => {
            const consoleWarnMock = jest
                .spyOn(console, 'warn')
                .mockImplementation()

            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({ id: '1337' }),
                    ],
                },
                //purposefully attaching invalid id to url here
                routerProvider: {
                    route: '/rates/133',
                },
                featureFlags: { 'rate-edit-unlock': true },
            })
            expect(consoleWarnMock).toHaveBeenCalled() // apollo testing mocks will console warn that your query is invalid - this is intentional
            expect(await screen.findByText('System error')).toBeInTheDocument()
        })

        it('renders back to dashboard link for state users', async () => {
            renderWithProviders(wrapInRoutes(<RateSummary />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({ id: '7a' }),
                    ],
                },
                routerProvider: {
                    route: '/rates/7a',
                },
                featureFlags: { 'rate-edit-unlock': true },
            })

            const backLink = await screen.findByRole('link', {
                name: /Back to dashboard/,
            })
            expect(backLink).toBeInTheDocument()

            expect(backLink).toHaveAttribute('href', '/dashboard')
        })
    })
})
