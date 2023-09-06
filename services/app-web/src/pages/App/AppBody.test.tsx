import { screen, waitFor } from '@testing-library/react'

import {
    ldUseClientSpy,
    renderWithProviders,
    userClickSignIn,
} from '../../testHelpers/jestHelpers'
import { AppBody } from './AppBody'
import {
    fetchCurrentUserMock,
    indexHealthPlanPackagesMockSuccess,
} from '../../testHelpers/apolloMocks'

window.scrollTo = jest.fn()
jest.mock('../../hooks/useTealium', () => ({
    useTealium: jest.fn().mockReturnValue([]),
}))

describe('App Body and routes', () => {
    afterEach(() => {
        jest.resetAllMocks()
    })
    afterAll(() => {
        jest.clearAllMocks()
    })

    it('App renders without errors', () => {
        ldUseClientSpy({ 'session-expiring-modal': false })
        renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
        const mainElement = screen.getByRole('main')
        expect(mainElement).toBeInTheDocument()
    })

    describe('Environment specific banner', () => {
        const OLD_ENV = process.env

        beforeEach(() => {
            jest.resetModules() // Most important - clears the cache
            process.env = { ...OLD_ENV } // Make a copy
        })

        afterAll(() => {
            process.env = OLD_ENV // Restore old environment
        })

        it('shows test environment banner in val', () => {
            process.env.REACT_APP_STAGE_NAME = 'val'
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
            })

            expect(
                screen.getByText('THIS IS A TEST ENVIRONMENT')
            ).toBeInTheDocument()
        })

        it('does not show test environment banner in prod', () => {
            process.env.REACT_APP_STAGE_NAME = 'prod'
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
            })

            expect(screen.queryByText('THIS IS A TEST ENVIRONMENT')).toBeNull()
        })
    })

    it('displays maintenance banner when flag is on', async () => {
        ldUseClientSpy({
            'site-under-maintenance-banner': 'UNSCHEDULED',
            'session-expiring-modal': false,
        })
        renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexHealthPlanPackagesMockSuccess(),
                ],
            },
        })
        expect(
            await screen.findByRole('heading', { name: 'Site unavailable' })
        ).toBeInTheDocument()
        expect(
            await screen.findByText(
                /MC-Review is currently unavailable due to technical issues/
            )
        ).toBeInTheDocument()
    })

    it('does not display maintenance banner when flag is off', async () => {
        ldUseClientSpy({ 'session-expiring-modal': false })
        renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({ statusCode: 200 }),
                    indexHealthPlanPackagesMockSuccess(),
                ],
            },
        })
        expect(
            screen.queryByRole('heading', { name: 'Site Unavailable' })
        ).toBeNull()
        expect(
            screen.queryByText(
                /MC-Review is currently unavailable due to technical issues/
            )
        ).toBeNull()
    })

    describe('/', () => {
        it('display dashboard when logged in', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
            })

            expect(
                screen.queryByRole('heading', { level: 1 })
            ).toBeInTheDocument()
            await waitFor(() => {
                expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
                expect(
                    screen.queryByRole('heading', {
                        name: /Page not found/i,
                    })
                ).toBeNull()
            })
        })

        it('display landing page when logged out', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /How it works/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
            expect(
                screen.getByRole('heading', {
                    name: /You can use MC-Review to submit Medicaid and CHIP managed care health plan contracts and rates to CMS. This portal accepts:/i,
                    level: 2,
                })
            ).toBeInTheDocument()
        })
    })

    describe('/auth', () => {
        it('when app loads at /auth route, Auth header is displayed', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/auth' },
            })

            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /Auth Page/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
            expect(
                screen.queryByRole('heading', {
                    name: /How it works/i,
                    level: 2,
                })
            ).toBeNull()
        })

        it('when user clicks Sign In link, redirects to /auth', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
            await userClickSignIn(screen)

            expect(
                screen.getByRole('heading', { name: /Auth Page/i, level: 2 })
            ).toBeInTheDocument()
        })

        it('display local login page when expected', async () => {
            ldUseClientSpy({})
            renderWithProviders(<AppBody authMode={'LOCAL'} />)

            await userClickSignIn(screen)

            expect(
                screen.getByRole('heading', {
                    name: /Local Login/i,
                    level: 3,
                })
            ).toBeInTheDocument()
        })

        it('display cognito signup page when expected', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
            await userClickSignIn(screen)

            expect(
                screen.getByRole('textbox', { name: 'First Name' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('textbox', { name: 'Last Name' })
            ).toBeInTheDocument()
            expect(
                screen.getByRole('form', { name: 'Signup Form' })
            ).toBeInTheDocument()
        })
    })

    describe('page scrolling', () => {
        it('scroll top on page load', async () => {
            ldUseClientSpy({})
            renderWithProviders(<AppBody authMode={'LOCAL'} />)
            await userClickSignIn(screen)
            expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
        })
    })

    describe('invalid routes', () => {
        it('redirect to landing page when logged out', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                routerProvider: { route: '/not-a-real-place' },
            })
            await waitFor(() => {
                expect(
                    screen.getByRole('heading', {
                        name: /How it works/i,
                        level: 2,
                    })
                ).toBeInTheDocument()
            })
        })

        it('redirects to 404 error page when logged in', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
                routerProvider: { route: '/not-a-real-place' },
            })

            await waitFor(() =>
                expect(
                    screen.getByRole('heading', {
                        name: /Page not found/i,
                        level: 1,
                    })
                ).toBeInTheDocument()
            )
        })
    })
})
