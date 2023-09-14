import { screen } from '@testing-library/react'

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

// Looking for routing tests? Check AppRoutes.test.tsx
describe('AppBody', () => {
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

    describe('Sign In buttton click', () => {
        it('displays local login heading when expected', async () => {
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

        it('displays Cognito login page when expected', async () => {
            ldUseClientSpy({ 'session-expiring-modal': false })
            renderWithProviders(<AppBody authMode={'AWS_COGNITO'} />)
            await userClickSignIn(screen)

            expect(
                screen.getByRole('heading', { name: /Auth Page/i, level: 2 })
            ).toBeInTheDocument()
        })

        it('displays Cognito signup page when expected', async () => {
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

    describe('Site under maintenance banner', () => {
        it('displays maintenance banner when feature flag is on', async () => {
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
    })

    describe('Page scrolling', () => {
        it('scroll top on page load', async () => {
            ldUseClientSpy({})
            renderWithProviders(<AppBody authMode={'LOCAL'} />)
            await userClickSignIn(screen)
            expect(window.scrollTo).toHaveBeenCalledWith(0, 0)
        })
    })
})
