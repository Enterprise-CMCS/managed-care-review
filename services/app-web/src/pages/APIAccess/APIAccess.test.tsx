import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../constants'
import { renderWithProviders } from '../../testHelpers'
import {
    fetchCurrentUserMock,
    mockValidCMSUser,
} from '../../testHelpers/apolloMocks'
import { APIAccess } from './APIAccess'

describe('APIAccess', () => {
    afterEach(() => {
        jest.resetAllMocks()
    })

    it('renders without errors', async () => {
        renderWithProviders(
            <Routes>
                <Route path={RoutesRecord.API_ACCESS} element={<APIAccess />} />
            </Routes>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/dev/api-access',
                },
            }
        )

        const foo = await screen.findByText('foobar')
        expect(foo).toBeInTheDocument()

        expect(true).toBeFalsy()
    })
})
