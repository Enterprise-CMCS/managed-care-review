import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, testS3Client } from '../../../testHelpers'
import {
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    mockValidCMSUser,
} from '../../../testHelpers/apolloMocks'
import { RateSummary } from './RateSummary'
import { RoutesRecord } from '../../../constants'
import { Route, Routes } from 'react-router-dom'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route path={RoutesRecord.RATES_SUMMARY} element={children} />
        </Routes>
    )
}

describe('RateSummary', () => {
    afterAll(() => jest.clearAllMocks())
    it('renders without errors', async () => {
        renderWithProviders(wrapInRoutes(<RateSummary />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidCMSUser(),
                        statusCode: 200,
                    }),
                    fetchRateMockSuccess({ rate: { id: '7a' } }),
                ],
            },
            routerProvider: {
                route: '/rates/7a',
            },
        })

        expect(
            await screen.findByText('Programs this rate certification covers')
        ).toBeInTheDocument()
    })

    it('renders document download warning banner when download fails', async () => {
        const error = jest.spyOn(console, 'error').mockImplementation(() => {
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
                    fetchRateMockSuccess({ rate: { id: '7a' } }),
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
                    fetchRateMockSuccess({ rate: { id: '7a' } }),
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
