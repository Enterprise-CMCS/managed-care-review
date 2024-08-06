import { renderWithProviders } from '../../../testHelpers'
import { RateReviewsDashboard } from './RateReviewsDashboard'
import {
    fetchCurrentUserMock,
    indexRatesMockFailure,
    iterableCmsUsersMockData,
} from '../../../testHelpers/apolloMocks'
import { indexRatesMockSuccess } from '../../../testHelpers/apolloMocks'
import { screen, waitFor } from '@testing-library/react'

describe('RateReviewsDashboard', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole RateReviewsDashboard tests',
        ({ userRole, mockUser }) => {
            it('renders dashboard with rates correctly', async () => {
                renderWithProviders(<RateReviewsDashboard />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockUser(),
                            }),
                            indexRatesMockSuccess(),
                        ],
                    },
                })

                // Wait for accordion and table components to load on page
                await waitFor(() => {
                    expect(
                        screen.queryByTestId('accordion')
                    ).toBeInTheDocument()
                    expect(screen.queryByTestId('table')).toBeInTheDocument()
                })

                // Expect 3 rates to be displayed
                expect(
                    screen.getByText('Displaying 3 of 3 rate reviews')
                ).toBeInTheDocument()
            })

            it('renders error failed request page', async () => {
                renderWithProviders(<RateReviewsDashboard />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockUser(),
                            }),
                            indexRatesMockFailure(),
                        ],
                    },
                })

                await waitFor(() => {
                    expect(
                        screen.queryByText(
                            "We're having trouble loading this page."
                        )
                    ).toBeInTheDocument()
                })
            })
        }
    )
})
