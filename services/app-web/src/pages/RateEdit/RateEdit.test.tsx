import { screen, waitFor } from '@testing-library/react'
import { ldUseClientSpy, renderWithProviders } from "../../testHelpers"
import { RateEdit } from "./RateEdit"
import { fetchCurrentUserMock, fetchRateMockSuccess, mockValidStateUser } from "../../testHelpers/apolloMocks"

describe('RateEdit', () => {
  afterAll(() => jest.clearAllMocks())

  describe('Viewing RateEdit as a state user', () => {
    beforeEach(() => {
      ldUseClientSpy({'rate-edit-unlock': true})
    })

    it('renders without errors', async () => {
      renderWithProviders(<RateEdit />, {
        apolloProvider: {
          mocks: [
            fetchCurrentUserMock({
              user: mockValidStateUser(),
              statusCode: 200,
            }),
            fetchRateMockSuccess({ rate: { id: '1337' } }),
          ],
        },
        routerProvider: {
          route: '/rates/1337'
        },
      })

      await waitFor(() => {
        expect(screen.queryByTestId('rate-edit')).toBeInTheDocument()
      })
    })
  })
})


