import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { basicStateSubmission } from '../../common-code/domain-mocks'
import { domainToBase64 } from '../../common-code/proto/stateSubmission'
import { RoutesRecord } from '../../constants/routes'
import {
    fetchCurrentUserMock, fetchStateSubmission2MockSuccess, mockUnlockedSubmission2, mockValidCMSUser, unlockStateSubmissionMockError, unlockStateSubmissionMockSuccess
} from '../../testHelpers/apolloHelpers'
import { renderWithProviders, userClickByTestId } from '../../testHelpers/jestHelpers'
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


    describe('Submission package data display', () =>{

        it('renders the OLD data for an unlocked submission for CMS user, ignoring unsubmitted changes from state user', async () => {
            const submission2 = mockUnlockedSubmission2()

            const oldPackageData = basicStateSubmission()
            const newPackageData = basicStateSubmission()

            oldPackageData.submissionDescription = 'OLD_DESCRIPTION'
            newPackageData.submissionDescription = 'NEW_DESCRIPTION'

            submission2.revisions[0].revision.submissionData =
                domainToBase64(newPackageData)
            submission2.revisions[1].revision.submissionData =
                domainToBase64(oldPackageData)

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
                            fetchStateSubmission2MockSuccess({
                                id: '15',
                                stateSubmission: submission2,
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
                            fetchStateSubmission2MockSuccess({
                                id: '15',
                            }),
                            unlockStateSubmissionMockSuccess({
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
                            fetchStateSubmission2MockSuccess({
                                id: '15',
                                stateSubmission: mockUnlockedSubmission2(),
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
                            fetchStateSubmission2MockSuccess({
                                id: '15',
                                stateSubmission: mockUnlockedSubmission2(),
                            }),
                        ],
                    },
                    routerProvider: {
                        route: '/submissions/15',
                    },
                }
            )

            const banner = expect(
                await screen.findByTestId('unlockedBanner')
            )
            banner.toBeInTheDocument()
            banner.toHaveClass('usa-alert--warning')
            banner.toHaveTextContent(
                /Unlocked on: (0?[1-9]|[12][0-9]|3[01])\/[0-9]+\/[0-9]+\s[0-9]+:[0-9]+[a-zA-Z]+\s[a-zA-Z]+/i
            )
            banner.toHaveTextContent('Unlocked by: bob@dmas.mn.govUnlocked')
            banner.toHaveTextContent(
                'Reason for unlock: Test unlock reason'
            )
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
                            fetchStateSubmission2MockSuccess({
                                id: '15',
                            }),
                            unlockStateSubmissionMockError({
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
                            fetchStateSubmission2MockSuccess({
                                id: '15',
                            }),
                            unlockStateSubmissionMockSuccess({
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

        it('displays form validation error when submitting unlock reason over 300 characters', async () => {
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
                            fetchStateSubmission2MockSuccess({
                                id: '15',
                            }),
                            unlockStateSubmissionMockSuccess({
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
            await waitFor(() => {
               expect(screen.getByRole('dialog')).toHaveClass('is-visible')
               expect(screen.getByText('Provide reason for unlocking')).toBeInTheDocument()
            })

            const textbox = screen.getByTestId('unlockReason')
            // Don't use userEvent.type here because it messes with jest timers with this length of content 
            userEvent.paste(
                textbox,
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin vulputate ultricies suscipit. Suspendisse consequat at mauris a iaculis. Praesent lorem massa, pellentesque et tempor et, laoreet quis lectus. Vestibulum finibus condimentum nulla, vel tristique tellus pretium sollicitudin. Curabitur velit enim, pulvinar eu fermentum vel, fringilla quis leo.'
            )

            const unlockButton = screen.getByTestId('unlockReason-modal-submit')
            userEvent.click(unlockButton)

            expect(
                await screen.findByText(
                    'Reason for unlocking submission is too long'
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
                              fetchStateSubmission2MockSuccess({
                                  id: '15',
                              }),
                              unlockStateSubmissionMockSuccess({
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
              await waitFor(() =>  screen.getByText('Provide reason for unlocking'))

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

