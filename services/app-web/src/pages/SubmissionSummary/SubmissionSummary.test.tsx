import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { basicStateSubmission } from '../../common-code/domain-mocks'
import { domainToBase64 } from '../../common-code/proto/stateSubmission'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock, fetchStateSubmission2MockSuccess, mockUnlockedSubmission2, mockValidCMSUser, unlockStateSubmissionMockError, unlockStateSubmissionMockSuccess
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
                        fetchStateSubmission2MockSuccess({
                            id: '15',
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

    it('renders an error when the proto is invalid', async () => {
        renderWithProviders(
            <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ user: mockValidCMSUser(),  statusCode: 200 }),
                        fetchStateSubmission2MockSuccess({
                            id: '15',
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
                        fetchStateSubmission2MockSuccess({
                            id: '15',
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
                        fetchStateSubmission2MockSuccess({
                            id: '15',
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

    it('disables the unlock button for an unlocked submission', async () => {
        renderWithProviders(
            <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ user: mockValidCMSUser(),  statusCode: 200 }),
                        fetchStateSubmission2MockSuccess({
                            id: '15',
                            stateSubmission: mockUnlockedSubmission2()
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Unlock submission'})).toBeDisabled()
        })
    })

    it('renders the OLD data for an unlocked submission, ignoring unsubmitted changes', async () => {

        const submission2 = mockUnlockedSubmission2()

        const oldPackageData = basicStateSubmission()
        const newPackageData = basicStateSubmission()

        oldPackageData.submissionDescription = 'OLD_DESCRIPTION'
        newPackageData.submissionDescription = 'NEW_DESCRIPTION'

        submission2.revisions[0].revision.submissionData = domainToBase64(newPackageData)
        submission2.revisions[1].revision.submissionData = domainToBase64(oldPackageData)

        renderWithProviders(
            <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ user: mockValidCMSUser(),  statusCode: 200 }),
                        fetchStateSubmission2MockSuccess({
                            id: '15',
                            stateSubmission: submission2
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        expect(await screen.findByText('OLD_DESCRIPTION')).toBeInTheDocument()
        expect(screen.queryByText('NEW_DESCRIPTION')).not.toBeInTheDocument()
    })

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
                        fetchStateSubmission2MockSuccess({
                            id: '15',
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
