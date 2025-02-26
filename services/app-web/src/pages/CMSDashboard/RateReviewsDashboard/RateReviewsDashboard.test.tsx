import { renderWithProviders } from '../../../testHelpers'
import { RateReviewsDashboard } from './RateReviewsDashboard'
import {
    fetchCurrentUserMock,
    indexRatesStrippedMockSuccess,
    indexRatesStrippedMockFailure,
    iterableCmsUsersMockData,
    strippedRateDataMock,
} from '@mc-review/mocks'
import { screen, waitFor } from '@testing-library/react'
import { RateStripped } from '../../../gen/gqlClient'

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
                            indexRatesStrippedMockSuccess(),
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

            it('renders dashboard without withdrawn rates', async () => {
                const rates: RateStripped[] = [
                    {
                        ...strippedRateDataMock(),
                        id: 'test-id-123',
                        stateNumber: 3,
                    },
                    {
                        ...strippedRateDataMock(),
                        id: 'test-id-124-withdrawn',
                        stateNumber: 2,
                        withdrawInfo: {
                            updatedAt: new Date(),
                            updatedBy: {
                                email: 'admin@example.com',
                                role: 'ADMIN_USER',
                                familyName: 'Hotman',
                                givenName: 'Iroh',
                            },
                            updatedReason: 'retreat!',
                        },
                    },
                    {
                        ...strippedRateDataMock(),
                        id: 'test-id-125-withdrawn',
                        stateNumber: 2,
                        withdrawInfo: {
                            updatedAt: new Date(),
                            updatedBy: {
                                email: 'admin@example.com',
                                role: 'ADMIN_USER',
                                familyName: 'Hotman',
                                givenName: 'Iroh',
                            },
                            updatedReason: 'retreat!',
                        },
                    },
                    {
                        ...strippedRateDataMock(),
                        id: 'test-id-126',
                        stateNumber: 1,
                    },
                ]
                renderWithProviders(<RateReviewsDashboard />, {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                statusCode: 200,
                                user: mockUser(),
                            }),
                            indexRatesStrippedMockSuccess(undefined, rates),
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

                // Expect 2 rates to be displayed
                expect(
                    screen.getByText('Displaying 2 of 2 rate reviews')
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
                            indexRatesStrippedMockFailure(),
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
