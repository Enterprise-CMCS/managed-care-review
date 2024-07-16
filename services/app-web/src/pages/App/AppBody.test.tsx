import { screen } from '@testing-library/react'

import {
    renderWithProviders,
    userClickSignIn,
} from '../../testHelpers/jestHelpers'
import { AppBody } from './AppBody'
import {
    fetchCurrentUserMock,
    indexHealthPlanPackagesMockSuccess,
} from '../../testHelpers/apolloMocks'
import { beforeEach } from 'vitest'

// Looking for routing tests? Check AppRoutes.test.tsx
describe('AppBody', () => {
    Object.defineProperty(window, 'scrollTo', {
        writable: true,
        value: vi.fn(),
    })
    afterEach(() => {
        vi.resetAllMocks()
    })
    afterAll(() => {
        vi.clearAllMocks()
    })

    it('App renders without errors', () => {
        renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
            featureFlags: { 'session-expiring-modal': false },
        })
        const mainElement = screen.getByRole('main')
        expect(mainElement).toBeInTheDocument()
    })

    describe('Sign In buttton click', () => {
        it('displays local login heading when expected', async () => {
            renderWithProviders(<AppBody authMode={'LOCAL'} />, {
                featureFlags: { 'session-expiring-modal': false },
            })

            await userClickSignIn(screen)

            expect(
                screen.getByRole('heading', {
                    name: /Local Login/i,
                    level: 3,
                })
            ).toBeInTheDocument()
        })

        it('displays Cognito login page when expected', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                featureFlags: { 'session-expiring-modal': false },
            })
            await userClickSignIn(screen)

            expect(
                screen.getByRole('heading', { name: /Auth Page/i, level: 2 })
            ).toBeInTheDocument()
        })

        it('displays Cognito signup page when expected', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                featureFlags: { 'session-expiring-modal': false },
            })
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

    describe('Environment specific banner', () => {
        const OLD_ENV = import.meta.env

        beforeEach(() => {
            vi.resetModules() // Most important - clears the cache
            Object.defineProperty(import.meta, 'env', {
                value: OLD_ENV,
                writable: true,
            })
        })

        afterAll(() => {
            Object.defineProperty(import.meta, 'env', {
                value: {
                    ...OLD_ENV,
                },
            })
        })

        it('shows test environment banner in val', () => {
            import.meta.env.VITE_APP_STAGE_NAME = 'val'
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            expect(
                screen.getByText('THIS IS A TEST ENVIRONMENT')
            ).toBeInTheDocument()
        })

        it('does not show test environment banner in prod', () => {
            import.meta.env.VITE_APP_STAGE_NAME = 'prod'
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
            })

            expect(screen.queryByText('THIS IS A TEST ENVIRONMENT')).toBeNull()
        })
    })

    describe('Site under maintenance banner', () => {
        it('displays maintenance banner when feature flag is on', async () => {
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
                featureFlags: {
                    'site-under-maintenance-banner': 'UNSCHEDULED',
                    'session-expiring-modal': false,
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
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />, {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        indexHealthPlanPackagesMockSuccess(),
                    ],
                },
                featureFlags: { 'session-expiring-modal': false },
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
    })

    describe('Page scrolling', () => {
        it('scroll top on page load', async () => {
            renderWithProviders(<AppBody authMode={'LOCAL'} />)
            await userClickSignIn(screen)
            expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
        })
    })
})
