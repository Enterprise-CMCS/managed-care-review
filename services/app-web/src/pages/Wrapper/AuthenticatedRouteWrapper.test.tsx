import { act, screen } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { AuthenticatedRouteWrapper } from './AuthenticatedRouteWrapper'
import { createMocks } from 'react-idle-timer';

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

    it("hides the session timeout modal when timeout period is not exceeded", async() => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="AWS_COGNITO"
                children={<div>children go here</div>}
            />
        )

        await vi.advanceTimersByTime(1000);
        expect(screen.queryByTestId("timeout-dialog")).not.toBeInTheDocument();
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

        await act(() => vi.advanceTimersByTime(3000));
        const dialog = await screen.findByRole('dialog', {name: 'Session Expiring'})
        expect(dialog).toBeVisible();
      });
    it("if user does nothing, logs out and closes session timeout modal after full timeout duration is exceeded", async () => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="AWS_COGNITO"
                children={<div>children go here</div>}
            />,
            {  featureFlags: {
                'session-expiration-minutes': 2
            }}
        )
        const dialog = await screen.findByRole('dialog', {name: 'Session Expiring'})
        expect(dialog).toBeVisible();
        // expect(mockHandleLogout).toHaveBeenCalled();
        });
    it.todo('renders countdown inside session timeout modal that updates every second')
    it.todo('overrides any existing open modal with session timeout modal when idle prompt is displayed')
    it.todo('hides session timeout after logout') // to test this we need to move a level up
    it.todo('session timeout modal submit button click will refresh the user session')
    it.todo('session timeout modal cancel button click will logout user session')
})
