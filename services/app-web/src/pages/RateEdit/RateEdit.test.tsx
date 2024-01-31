import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers'
import { RateEdit } from './RateEdit'
import {
    fetchCurrentUserMock,
    fetchRateMockSuccess,
    mockValidStateUser,
} from '../../testHelpers/apolloMocks'
import { RoutesRecord } from '../../constants'
import { Route, Routes } from 'react-router-dom'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route path={RoutesRecord.RATE_EDIT} element={children} />
        </Routes>
    )
}

describe('RateEdit', () => {
    afterAll(() => jest.clearAllMocks())

    describe('Viewing RateEdit as a state user', () => {
        it('renders without errors', async () => {
            renderWithProviders(wrapInRoutes(<RateEdit />), {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidStateUser(),
                            statusCode: 200,
                        }),
                        fetchRateMockSuccess({
                            rate: { id: '1337', status: 'UNLOCKED' },
                        }),
                    ],
                },
                routerProvider: {
                    route: '/rates/1337/edit',
                },
                featureFlags: {
                    'rate-edit-unlock': true,
                },
            })

            await waitFor(() => {
                expect(screen.queryByTestId('rate-edit')).toBeInTheDocument()
            })
        })
    })
})
