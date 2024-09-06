import { act, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AuthenticatedRouteWrapper } from './AuthenticatedRouteWrapper'
import { createMocks } from 'react-idle-timer';
import { Landing } from '../Landing/Landing';
import { Location, Route, Routes } from 'react-router';
import { RoutesRecord } from '../../constants';
import * as CognitoAuthApi from '../Auth/cognitoAuth'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks';
describe('AuthenticatedRouteWrapper', () => {
    beforeAll(() => {
        vi.useFakeTimers();
        createMocks();
      });

      afterAll(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.clearAllMocks();
      });

    it('renders without errors', async () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="LOCAL"
                children={<div>children go here</div>}
            />
        )
        const kids = await screen.findByText('children go here')
        expect(kids).toBeInTheDocument()
    })

    it('hides the session timeout modal by default', async () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="AWS_COGNITO"
                children={<div>children go here</div>}
            />
        )
        const dialog = await screen.findByRole('dialog', {name: 'Session Expiring'})
        expect(dialog).toBeInTheDocument()
        expect(dialog).toHaveClass('is-hidden')
    })

    it("hides the session timeout modal by when timeout period is not exceeded", async() => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="AWS_COGNITO"
                children={<div>children go here</div>}
            />,
            {  featureFlags: {
                'session-expiration-minutes': 3
            }}
        )

        const dialogOnLoad = await screen.findByRole('dialog', {name: 'Session Expiring'})
        expect(dialogOnLoad).toBeInTheDocument()
        expect(dialogOnLoad).toHaveClass('is-hidden')
        await act(() => vi.advanceTimersByTime(500));
        const dialogAfterIdle = await screen.findByRole('dialog', {name: 'Session Expiring'})
        expect(dialogAfterIdle).toHaveClass('is-hidden')
      });


    it("renders session timeout modal after idle prompt period is exceeded", async () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="AWS_COGNITO"
                children={<div>children go here</div>}
            />,
            {  featureFlags: {
                'session-expiration-minutes': 2
            }}
        )
        const dialogOnLoad = await screen.findByRole('dialog', {name: 'Session Expiring'})
        expect(dialogOnLoad).toBeInTheDocument()
        expect(dialogOnLoad).toHaveClass('is-hidden')

        await act(() => vi.advanceTimersByTime(1000));

        const dialogAfterIdle = await screen.findByRole('dialog', {name: 'Session Expiring'})
        expect(dialogAfterIdle).toHaveClass('is-visible')
      });


    it("renders session timeout modal and if countdown elapses and user does nothing, calls sign out", async () => {
        const logoutSpy = vi
        .spyOn(CognitoAuthApi, 'signOut')
        .mockResolvedValue(null)


        renderWithProviders(
            <div>
                <AuthenticatedRouteWrapper
                authMode="AWS_COGNITO"
                children={<div>children go here</div>}
            />
            </div>,
            {  featureFlags: {
                'session-expiration-minutes': 2
            }}
        )

            const dialogOnLoad = await screen.findByRole('dialog', {name: 'Session Expiring'})
            expect(dialogOnLoad).toBeInTheDocument()
            expect(dialogOnLoad).toHaveClass('is-hidden')

            await act(() => vi.advanceTimersByTime(1000));
            const dialogAfterIdle = await screen.findByRole('dialog', {name: 'Session Expiring'})
            expect(dialogAfterIdle).toHaveClass('is-visible')


            await act(() => vi.advanceTimersByTime(120100));
            expect(logoutSpy).toHaveBeenCalled()

        });

    it.todo('renders countdown inside session timeout modal that updates every second')
    it.todo('session timeout modal continue session button click will refresh the user session')
    it.todo('session timeout modal logout button click will logout user session')
})
