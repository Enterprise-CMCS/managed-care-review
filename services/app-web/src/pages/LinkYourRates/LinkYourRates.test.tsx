import { screen, waitFor } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    indexRatesMockSuccess,
    mockValidCMSUser,
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
                        user: mockValidCMSUser(),
                    }),
                    indexRatesMockSuccess(),
                ],
            },
        })

        await waitFor(() => {
            expect(screen.queryByTestId('linkYourRates')).toBeInTheDocument()
        })
    })
})
