import { screen, waitFor } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    indexRatesMockSuccess,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { LinkYourRates } from './LinkYourRates'

describe('LinkYourRates', () => {
    it('renders without errors', async () => {
        renderWithProviders(<LinkYourRates />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockValidStateUser(),
                    }),
                    indexRatesMockSuccess(),
                ],
            },
        })

        await waitFor(() => {
            expect(screen.queryByTestId('linkYourRates')).toBeInTheDocument()
        })
    })

    it('does not display dropdown menu if no is selected', async () => {
        renderWithProviders(<LinkYourRates />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockValidStateUser(),
                    }),
                    indexRatesMockSuccess(),
                ],
            },
        })

        screen
            .getByLabelText(
                'Yes, this rate certification is part of another submission'
            )
            .click()

        await waitFor(() => {
            expect(screen.queryByTestId('linkRateSelect')).toBeInTheDocument()
        })
    })

    it('displays dropdown menu if yes is selected', async () => {
        renderWithProviders(<LinkYourRates />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        statusCode: 200,
                        user: mockValidStateUser(),
                    }),
                    indexRatesMockSuccess(),
                ],
            },
        })

        screen
            .getByLabelText(
                'No, this rate certification was not included with any other submissions'
            )
            .click()

        await waitFor(() => {
            expect(
                screen.queryByTestId('linkRateSelect')
            ).not.toBeInTheDocument()
        })
    })
})
