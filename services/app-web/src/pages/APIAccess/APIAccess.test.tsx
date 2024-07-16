import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { RoutesRecord } from '../../constants'
import { renderWithProviders } from '../../testHelpers'
import {
    createAPIKeySuccess,
    fetchCurrentUserMock,
    mockValidCMSUser,
    createAPIKeyNetworkError,
} from '../../testHelpers/apolloMocks'
import { APIAccess } from './APIAccess'

describe('APIAccess', () => {
    afterEach(() => {
        vi.resetAllMocks()
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

        const instructions = await screen.findByText(
            'To interact with the MC-Review API you will need a valid JWT'
        )
        expect(instructions).toBeInTheDocument()
    })

    it('displays an API key on success', async () => {
        const { user } = renderWithProviders(
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
                        createAPIKeySuccess(),
                    ],
                },
                routerProvider: {
                    route: '/dev/api-access',
                },
            }
        )

        const generateButton = await screen.findByRole('button', {
            name: 'Generate API Key',
        })
        await user.click(generateButton)

        const apiKey = await screen.findByRole('code', { name: 'API Key Text' })
        const curlCmd = await screen.findByRole('code', {
            name: 'Example Curl Command',
        })

        expect(apiKey).toBeInTheDocument()
        expect(apiKey.textContent).toBe('foo.bar.baz.key123')
        expect(curlCmd).toBeInTheDocument()
    })

    it('displays error on error', async () => {
        const { user } = renderWithProviders(
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
                        createAPIKeyNetworkError(),
                    ],
                },
                routerProvider: {
                    route: '/dev/api-access',
                },
            }
        )

        const generateButton = await screen.findByRole('button', {
            name: 'Generate API Key',
        })
        await user.click(generateButton)

        const errorMsg = await screen.findByText('System error')
        expect(errorMsg).toBeInTheDocument()
    })
})
