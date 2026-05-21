import { screen, act } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AuthenticatedRouteWrapper } from './AuthenticatedRouteWrapper'
import { createMocks } from 'react-idle-timer'
import * as CognitoAuthApi from '../Auth/cognitoAuth'
import { dayjs } from '@mc-review/dates'

describe('AuthenticatedRouteWrapper and SessionTimeoutModal', () => {
    beforeAll(() => {
        vi.useFakeTimers()
        createMocks()
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    afterAll(() => {
        vi.clearAllTimers()
        vi.useRealTimers()
    })

    it('renders without errors', () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper children={<div>children go here</div>} />
        )
        expect(screen.getByText('children go here')).toBeInTheDocument()
    })

    it('hides the session timeout modal by default', () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                children={<div>children go here</div>}
            />,
            {
                featureFlags: {
                    'session-expiration-minutes': 3,
                    'session-expiring-modal': true,
                },
            }
        )
        const dialog = screen.getByRole('dialog', { name: 'Session Expiring' })
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveClass('is-hidden')
    })

    it('hides the session timeout modal by when timeout period is not exceeded', async () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                children={<div>children go here</div>}
            />,
            {
                featureFlags: {
                    'session-expiration-minutes': 3,
                    'session-expiring-modal': true,
                },
            }
        )

        const dialog = screen.getByRole('dialog', { name: 'Session Expiring' })
        expect(dialog).toHaveClass('is-hidden')
        await vi.advanceTimersByTimeAsync(500)
        expect(dialog).toHaveClass('is-hidden')
    })

    it('renders session timeout modal after idle prompt period is exceeded', async () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                children={<div>children go here</div>}
            />,
            {
                featureFlags: {
                    'session-expiration-minutes': 2,
                    'session-expiring-modal': true,
                },
            }
        )
        const dialog = screen.getByRole('dialog', { name: 'Session Expiring' })
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveClass('is-hidden')

        await vi.advanceTimersByTimeAsync(1000)

        expect(dialog).toHaveClass('is-visible')
    })

    it('renders session timeout modal and if countdown elapses and user does nothing, calls sign out', async () => {
        const logoutSpy = vi
            .spyOn(CognitoAuthApi, 'signOut')
            .mockResolvedValue(null)

        renderWithProviders(
            <div>
                <AuthenticatedRouteWrapper
                    children={<div>children go here</div>}
                />
            </div>,
            {
                featureFlags: {
                    'session-expiration-minutes': 2,
                    'session-expiring-modal': true,
                },
            }
        )

        const dialog = screen.getByRole('dialog', { name: 'Session Expiring' })
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveClass('is-hidden')

        await vi.advanceTimersByTimeAsync(1000)
        expect(dialog).toHaveClass('is-visible')

        await vi.advanceTimersByTimeAsync(120100)
        expect(logoutSpy).toHaveBeenCalled()
    })

    it('renders countdown inside session timeout modal that updates every second', async () => {
        renderWithProviders(
            <div>
                <AuthenticatedRouteWrapper
                    children={<div>children go here</div>}
                />
            </div>,
            {
                featureFlags: {
                    'session-expiration-minutes': 2,
                    'session-expiring-modal': true,
                },
            }
        )
        screen.getByRole('dialog', { name: 'Session Expiring' })

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000)
        })
        const timeElapsedBefore = screen.getByTestId('remaining').textContent

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000)
        })
        const timeElapsedAfter = screen.getByTestId('remaining').textContent

        const diff = dayjs(timeElapsedBefore, 'mm:ss').diff(
            dayjs(timeElapsedAfter, 'mm:ss'),
            'milliseconds'
        )
        expect(diff).toBe(1000)
    })

    it('session timeout modal continue session button click will refresh the user session', async () => {
        const refreshSpy = vi
            .spyOn(CognitoAuthApi, 'extendSession')
            .mockResolvedValue(null)

        renderWithProviders(
            <div>
                <AuthenticatedRouteWrapper
                    children={<div>children go here</div>}
                />
            </div>,
            {
                featureFlags: {
                    'session-expiration-minutes': 2,
                    'session-expiring-modal': true,
                },
            }
        )
        const dialog = screen.getByRole('dialog', { name: 'Session Expiring' })
        await vi.advanceTimersByTimeAsync(1000)
        expect(dialog).toHaveClass('is-visible')
        screen.getByText('Continue Session').click()
        await vi.advanceTimersByTimeAsync(0)
        expect(dialog).not.toHaveClass('is-visible')
        expect(refreshSpy).toHaveBeenCalled()
    })

    it('session timeout modal Logout button click will logout user session', async () => {
        const logoutSpy = vi
            .spyOn(CognitoAuthApi, 'signOut')
            .mockResolvedValue(null)

        renderWithProviders(
            <div>
                <AuthenticatedRouteWrapper
                    children={<div>children go here</div>}
                />
            </div>,
            {
                featureFlags: {
                    'session-expiration-minutes': 2,
                    'session-expiring-modal': true,
                },
            }
        )
        const dialog = screen.getByRole('dialog', { name: 'Session Expiring' })
        await vi.advanceTimersByTimeAsync(1000)
        expect(dialog).toHaveClass('is-visible')
        screen.getByText('Logout').click()
        expect(logoutSpy).toHaveBeenCalled()
    })
})
