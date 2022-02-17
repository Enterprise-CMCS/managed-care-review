import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock, fetchStateSubmissionMock, mockValidCMSUser, unlockStateSubmissionMockError, unlockStateSubmissionMockSuccess
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { SubmissionSummary } from './SubmissionSummary'


describe('SubmissionSummary', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ user: mockValidCMSUser(),  statusCode: 200 }),
                        fetchStateSubmissionMock({
                            id: '15',
                            statusCode: 200,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        expect(
           await screen.findByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
    })

    it('renders the unlock button', async () => {
        renderWithProviders(
            <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ user: mockValidCMSUser(),  statusCode: 200 }),
                        fetchStateSubmissionMock({
                            id: '15',
                            statusCode: 200,
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        expect(
           await screen.findByRole('button', { name: 'Unlock submission' })
        ).toBeInTheDocument()
    })

    it('displays no error on success', async () => {
        renderWithProviders(
            <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ user: mockValidCMSUser(),  statusCode: 200 }),
                        fetchStateSubmissionMock({
                            id: '15',
                            statusCode: 200,
                        }),
                        unlockStateSubmissionMockSuccess({id: '15'})
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        const unlockModalButton = await screen.findByRole('button', { name: 'Unlock submission' })
        userEvent.click(unlockModalButton)

        // the popup dialog should be visible now
        await waitFor(() => {
            const dialog = screen.getByRole('dialog')
            expect(dialog).toHaveClass('is-visible')
        })

        const unlockButton = screen.getByTestId('modal-submit')
        userEvent.click(unlockButton)

        // the popup dialog should be hidden again
        await waitFor(() => {
            const dialog = screen.getByRole('dialog')
            expect(dialog).toHaveClass('is-hidden')
        })

        expect(screen.queryByText(
            'Error attempting to unlock. Please try again.'
        )).toBeNull()
    })

    // it.only('disables the unlock button after unlock succeeds', async () => {
    //     renderWithProviders(
    //         <Route
    //                 path={RoutesRecord.SUBMISSIONS_FORM}
    //                 component={SubmissionSummary}
    //             />,
    //         {
    //             apolloProvider: {
    //                 mocks: [
    fetchCurrentUserMock({ user: mockValidCMSUser(),  statusCode: 200 }),
    //                     fetchStateSubmissionMock({
    //                         id: '15',
    //                         statusCode: 200,
    //                     }),
    //                     unlockStateSubmissionMockSuccess({id: '15'})
    //                 ],
    //             },
    //             routerProvider: {
    //                 route: '/submissions/15',
    //             },
    //         }
    //     )

    //     const unlockModalButton = await screen.findByRole('button', { name: 'Unlock submission' })

    //     userEvent.click(unlockModalButton)

    //     const unlockButton = await screen.findByTestId('modal-submit')

    //     userEvent.click(unlockButton)

    //     await waitFor(() => {
    //         expect(screen.findByRole('button', { name: 'Unlock submission'})).toBeDisabled()
    //     })
    // })

    it('displays an error if unlock fails', async () => {
        renderWithProviders(
            <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ user: mockValidCMSUser(),  statusCode: 200 }),
                        fetchStateSubmissionMock({
                            id: '15',
                            statusCode: 200,
                        }),
                        unlockStateSubmissionMockError({id: '15'})
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        const unlockModalButton = await screen.findByRole('button', { name: 'Unlock submission' })
        userEvent.click(unlockModalButton)

        // the popup dialog should be visible now
        await waitFor(() => {
            const dialog = screen.getByRole('dialog')
            expect(dialog).toHaveClass('is-visible')
        })

        const unlockButton = screen.getByTestId('modal-submit')
        userEvent.click(unlockButton)

        // the popup dialog should be hidden again
        await waitFor(() => {
            const dialog = screen.getByRole('dialog')
            expect(dialog).toHaveClass('is-hidden')
        })

        expect(await screen.findByText(
            'Error attempting to unlock. Please try again.'
        )).toBeInTheDocument()
    })

})
