import { act, screen} from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AuthenticatedRouteWrapper } from './AuthenticatedRouteWrapper'
import { createMocks } from 'react-idle-timer';
import * as CognitoAuthApi from '../Auth/cognitoAuth'
import { dayjs } from '../../common-code/dateHelpers';


describe('AuthenticatedRouteWrapper and SessionTimeoutModal', () => {
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

    it('renders countdown inside session timeout modal that updates every second', async() => {
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
        await screen.findByRole('dialog', {name: 'Session Expiring'})
        await act(() => vi.advanceTimersByTime(1000))
        const timeElapsedBefore =  screen.getByTestId('remaining').textContent
        await act(() => vi.advanceTimersByTime(1000))
        const timeElapsedAfter =  screen.getByTestId('remaining').textContent

        const diff =  dayjs(timeElapsedBefore, 'mm:ss').diff(dayjs(timeElapsedAfter, 'mm:ss'), 'milliseconds')
        expect(diff).toBe(1000)
    })

    it('session timeout modal continue session button click will refresh the user session', async ()=>{
        const refreshSpy = vi
        .spyOn(CognitoAuthApi, 'extendSession')
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

            await act(() => vi.advanceTimersByTime(1000));
            const dialogAfterIdle = await screen.findByRole('dialog', {name: 'Session Expiring'})
            expect(dialogAfterIdle).toHaveClass('is-visible');
            (await screen.findByText('Continue Session')).click()
            await screen.findByRole('dialog', {name: 'Session Expiring'})
            expect(dialogAfterIdle).not.toHaveClass('is-visible');
            expect(refreshSpy).toHaveBeenCalled()
    })

    it('session timeout modal Logout button click will logout user session', async () =>{
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

            await act(() => vi.advanceTimersByTime(1000));
            const dialogAfterIdle = await screen.findByRole('dialog', {name: 'Session Expiring'})
            expect(dialogAfterIdle).toHaveClass('is-visible');
            (await screen.findByText('Logout')).click()
            expect(logoutSpy).toHaveBeenCalled()
    })
})
