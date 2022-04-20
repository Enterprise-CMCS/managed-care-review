import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { basicLockedHealthPlanFormData } from '../../common-code/healthPlanFormDataMocks'
import { domainToBase64 } from '../../common-code/proto/stateSubmission'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock,
    fetchStateHealthPlanPackageMockSuccess,
    mockUnlockedHealthPlanPackage,
    mockValidCMSUser,
    unlockHealthPlanPackageMockError,
    unlockHealthPlanPackageMockSuccess,
    mockSubmittedHealthPlanPackageWithRevision,
} from '../../testHelpers/apolloHelpers'
import {
    renderWithProviders,
    userClickByTestId,
} from '../../testHelpers/jestHelpers'
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
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
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

    it('renders submission updated banner', async () => {
        const submissionsWithRevisions =
            mockSubmittedHealthPlanPackageWithRevision()
        renderWithProviders(
            <Route
                path={RoutesRecord.SUBMISSIONS_FORM}
                component={SubmissionSummary}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidCMSUser(),
                            statusCode: 200,
                        }),
                        fetchStateHealthPlanPackageMockSuccess({
                            stateSubmission: submissionsWithRevisions,
                            id: '15',
                        }),
                    ],
                },
                routerProvider: {
                    route: '/submissions/15',
                },
            }
        )

        const banner = expect(
            await screen.findByTestId('updatedSubmissionBanner')
        )
        banner.toBeInTheDocument()
        banner.toHaveClass('usa-alert--info')
        banner.toHaveTextContent(
            /Updated on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
        )
        banner.toHaveTextContent('Submitted by: aang@example.com')
        banner.toHaveTextContent(
            'Changes made: Placeholder resubmission reason'
        )
    })

    describe('Submission package data display', () => {
        it('renders the OLD data for an unlocked submission for CMS user, ignoring unsubmitted changes from state user', async () => {
            const pkg = mockUnlockedHealthPlanPackage()

            const oldPackageData = basicLockedHealthPlanFormData()
            const newPackageData = basicLockedHealthPlanFormData()

            oldPackageData.submissionDescription = 'OLD_DESCRIPTION'
            newPackageData.submissionDescription = 'NEW_DESCRIPTION'

            pkg.revisions[0].node.formDataProto = domainToBase64(newPackageData)
            pkg.revisions[1].node.formDataProto = domainToBase64(oldPackageData)

            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                                stateSubmission: pkg,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )

            expect(
                await screen.findByText('OLD_DESCRIPTION')
            ).toBeInTheDocument()
            expect(
                screen.queryByText('NEW_DESCRIPTION')
            ).not.toBeInTheDocument()
        })

        it.todo('renders an error when the proto is invalid')
    })

    describe('CMS user unlock submission', () => {
        it('renders the unlock button', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
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
                await screen.findByRole('button', {
                    name: 'Unlock submission',
                })
            ).toBeInTheDocument()
        })

        it('displays no error on unlock success', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                            }),
                            unlockHealthPlanPackageMockSuccess({
                                id: '15',
                                reason: 'Test unlock reason',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )

            const unlockModalButton = await screen.findByRole('button', {
                name: 'Unlock submission',
            })
            userEvent.click(unlockModalButton)

            // the popup dialog should be visible now
            await waitFor(() => {
                const dialog = screen.getByRole('dialog')
                expect(dialog).toHaveClass('is-visible')
            })

            const textbox = screen.getByTestId('unlockReason')
            userEvent.type(textbox, 'Test unlock reason')

            const unlockButton = screen.getByTestId('unlockReason-modal-submit')
            userEvent.click(unlockButton)

            // the popup dialog should be hidden again
            await waitFor(() => {
                const dialog = screen.getByRole('dialog')
                expect(dialog).toHaveClass('is-hidden')
            })

            expect(
                screen.queryByText(
                    'Error attempting to unlock. Please try again.'
                )
            ).toBeNull()
        })

        it('extracts the correct dates from the submission and displays them in tables', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                                stateSubmission:
                                    mockSubmittedHealthPlanPackageWithRevision(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )
            await waitFor(() => {
                const rows = screen.getAllByRole('row')
                expect(rows).toHaveLength(10)
                expect(
                    within(rows[0]).getByText('Date added')
                ).toBeInTheDocument()
                expect(within(rows[1]).getByText('3/25/22')).toBeInTheDocument()
                expect(within(rows[2]).getByText('3/28/22')).toBeInTheDocument()
                expect(
                    within(rows[7]).getByText('Date added')
                ).toBeInTheDocument()
                expect(within(rows[9]).getByText('3/25/22')).toBeInTheDocument()
            })
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
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                                stateSubmission:
                                    mockUnlockedHealthPlanPackage(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )

            await waitFor(() => {
                expect(
                    screen.getByRole('button', {
                        name: 'Unlock submission',
                    })
                ).toBeDisabled()
            })
        })

        it('displays unlock banner with correct data for an unlocked submission', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                                stateSubmission:
                                    mockUnlockedHealthPlanPackage(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )

            const banner = expect(await screen.findByTestId('unlockedBanner'))
            banner.toBeInTheDocument()
            banner.toHaveClass('usa-alert--warning')
            banner.toHaveTextContent(
                /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+ ET/i
            )
            banner.toHaveTextContent('Unlocked by: bob@dmas.mn.govUnlocked')
            banner.toHaveTextContent('Reason for unlock: Test unlock reason')
        })

        it('displays page alert banner error if unlock api request fails', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                            }),
                            unlockHealthPlanPackageMockError({
                                id: '15',
                                reason: 'Test unlock reason',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )

            const unlockModalButton = await screen.findByRole('button', {
                name: 'Unlock submission',
            })
            userEvent.click(unlockModalButton)

            // the popup dialog should be visible now
            await waitFor(() => {
                const dialog = screen.getByRole('dialog')
                expect(dialog).toHaveClass('is-visible')
            })

            const textbox = screen.getByTestId('unlockReason')
            userEvent.type(textbox, 'Test unlock reason')

            const unlockButton = screen.getByTestId('unlockReason-modal-submit')
            userEvent.click(unlockButton)

            // the popup dialog should be hidden again
            await waitFor(() => {
                const dialog = screen.getByRole('dialog')
                expect(dialog).toHaveClass('is-hidden')
            })

            expect(
                await screen.findByText(
                    'Error attempting to unlock. Please try again.'
                )
            ).toBeInTheDocument()
        })

        it('displays form validation error when submitting without a unlock reason', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                            }),
                            unlockHealthPlanPackageMockSuccess({
                                id: '15',
                                reason: 'Test unlock reason',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )

            const unlockModalButton = await screen.findByRole('button', {
                name: 'Unlock submission',
            })
            userEvent.click(unlockModalButton)

            // the popup dialog should be visible now
            await waitFor(() => {
                const dialog = screen.getByRole('dialog')
                expect(dialog).toHaveClass('is-visible')
            })

            const unlockButton = screen.getByTestId('unlockReason-modal-submit')
            userEvent.click(unlockButton)

            expect(
                await screen.findByText(
                    'Reason for unlocking submission is required'
                )
            ).toBeInTheDocument()
        })

        it('draws focus to unlock reason input when form validation errors exist', async () => {
            renderWithProviders(
                <Route
                    path={RoutesRecord.SUBMISSIONS_FORM}
                    component={SubmissionSummary}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({
                                user: mockValidCMSUser(),
                                statusCode: 200,
                            }),
                            fetchStateHealthPlanPackageMockSuccess({
                                id: '15',
                            }),
                            unlockHealthPlanPackageMockSuccess({
                                id: '15',
                                reason: 'Test Reason',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )

            const unlockModalButton = await screen.findByRole('button', {
                name: 'Unlock submission',
            })
            userEvent.click(unlockModalButton)

            // the popup dialog should be visible now
            await waitFor(() =>
                screen.getByText('Provide reason for unlocking')
            )

            const textbox = await screen.findByTestId('unlockReason')

            // submit without entering anything
            userClickByTestId(screen, 'unlockReason-modal-submit')

            expect(
                await screen.findByText(
                    'Reason for unlocking submission is required'
                )
            ).toBeInTheDocument()

            // check focus after error
            expect(textbox).toHaveFocus()
        })
    })
})
