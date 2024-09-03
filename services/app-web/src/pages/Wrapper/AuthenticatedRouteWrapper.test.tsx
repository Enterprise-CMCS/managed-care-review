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

    it("does not render session timeout modal before timeout period is exceeded", async() => {
        renderWithProviders(
            <AuthenticatedRouteWrapper
                authMode="AWS_COGNITO"
                children={<div>children go here</div>}
            />
        )

        await vi.advanceTimersByTime(1000);
        expect(screen.queryByTestId("timeout-dialog")).not.toBeInTheDocument();
      });

    // it("renders session timeout modal after idle prompt period is exceeded", async () => {
    //     act(() => vi.advanceTimersByTime(3000));
    //     const dialog = await screen.findByRole('dialog', {name: 'Session Expiring'})
    //     expect(dialog).toBeVisible();
    //     expect(mockHandleLogout).not.toHaveBeenCalled();
    //   });

    // it("logs out and closes session timeout modal after full timeout duration is exceeded", async () => {
    // act(() => vi.advanceTimersByTime(3000));
    // const dialog = await screen.findByRole('dialog', {name: 'Session Expiring'})
    // expect(dialog).toBeVisible();
    // expect(mockHandleLogout).toHaveBeenCalled();
    // });
})
