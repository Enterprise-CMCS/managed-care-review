import { createRef } from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
    mockBaseContract,
    mockSubmittedHealthPlanPackage,
    mockSubmittedHealthPlanPackageWithRevisions,
    submitHealthPlanPackageMockError,
    submitHealthPlanPackageMockSuccess,
    unlockHealthPlanPackageMockError,
    unlockHealthPlanPackageMockSuccess,
    mockUnlockedHealthPlanPackage,
} from '../../testHelpers/apolloMocks'
import { UnlockSubmitModal } from './UnlockSubmitModal'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { Location } from 'react-router-dom'

describe('UnlockSubmitModal', () => {
    const mockSetIsSubmitting = jest.fn()

    describe('initial submission modal', () => {
        it('displays correct modal when submitting initial submission', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    healthPlanPackage={mockBaseContract()}
                    submissionName="Test-Submission"
                    modalType="SUBMIT"
                    modalRef={modalRef}
                    setIsSubmitting={mockSetIsSubmitting}
                />
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            const confirmSubmit = screen.getByTestId('submit-modal-submit')
            expect(confirmSubmit).toBeInTheDocument()
            expect(screen.getByText('Ready to submit?')).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Submitting this package will send it to CMS to begin their review.'
                )
            ).toBeInTheDocument()
        })
        it('redirects if submission succeeds', async () => {
            let testLocation: Location
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    healthPlanPackage={mockBaseContract()}
                    submissionName="Test-Submission"
                    modalType="SUBMIT"
                    modalRef={modalRef}
                    setIsSubmitting={mockSetIsSubmitting}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            submitHealthPlanPackageMockSuccess({
                                id: mockBaseContract().id,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `draftSubmission/${
                            mockBaseContract().id
                        }/review-and-submit`,
                    },
                    location: (location) => (testLocation = location),
                }
            )

            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            await userEvent.click(screen.getByTestId('submit-modal-submit'))

            await waitFor(() =>
                expect(testLocation.pathname).toBe(`/dashboard/submissions`)
            )
            await waitFor(() =>
                expect(testLocation.search).toBe(
                    `?justSubmitted=Test-Submission`
                )
            )
        })
        it('redirects if submission succeeds, but failed sending emails', async () => {
            let testLocation: Location
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    healthPlanPackage={mockBaseContract()}
                    submissionName="Test-Submission"
                    modalType="SUBMIT"
                    modalRef={modalRef}
                    setIsSubmitting={mockSetIsSubmitting}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            submitHealthPlanPackageMockError({
                                id: mockBaseContract().id,
                                error: {
                                    code: 'INTERNAL_SERVER_ERROR',
                                    cause: 'EMAIL_ERROR',
                                },
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `draftSubmission/${
                            mockBaseContract().id
                        }/review-and-submit`,
                    },
                    location: (location) => (testLocation = location),
                }
            )

            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            await userEvent.click(screen.getByTestId('submit-modal-submit'))

            await waitFor(() =>
                expect(testLocation.pathname).toBe(`/dashboard/submissions`)
            )
            await waitFor(() =>
                expect(testLocation.search).toBe(
                    `?justSubmitted=Test-Submission`
                )
            )
        })
        it('displays modal alert banner error if submit api request fails', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    healthPlanPackage={mockBaseContract()}
                    submissionName="Test-Submission"
                    modalType="SUBMIT"
                    modalRef={modalRef}
                    setIsSubmitting={mockSetIsSubmitting}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            submitHealthPlanPackageMockError({
                                id: mockBaseContract().id,
                            }),
                        ],
                    },
                }
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            await userEvent.click(screen.getByTestId('submit-modal-submit'))

            expect(
                await screen.findByText('Error attempting to submit.')
            ).toBeInTheDocument()
            const errorHeading = screen.queryByRole('heading', {
                name: 'Submission error',
            })
            expect(errorHeading).toBeInTheDocument()
            await waitFor(() =>
                expect(mockSetIsSubmitting).toHaveBeenCalledTimes(2)
            )
        })
    })

    describe('unlock submission modal', () => {
        it('displays correct modal when unlocking submission', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK"
                    healthPlanPackage={mockSubmittedHealthPlanPackageWithRevisions()}
                />
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            expect(
                screen.getByText('Reason for unlocking submission')
            ).toBeInTheDocument()
            expect(
                screen.getByText('Provide reason for unlocking')
            ).toBeInTheDocument()
            expect(
                screen.getByTestId('unlockSubmitModalInput')
            ).toBeInTheDocument()
            expect(screen.getByTestId('unlock-modal-submit')).toHaveTextContent(
                'Unlock'
            )
        })

        it('displays form validation error when submitting without a unlock reason', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK"
                    healthPlanPackage={mockSubmittedHealthPlanPackageWithRevisions()}
                />
            )
            await waitFor(() => handleOpen())
            await screen.findByTestId('unlockSubmitModalInput')

            const modalSubmit = screen.getByTestId('unlock-modal-submit')
            expect(modalSubmit).toHaveTextContent('Unlock')
            await userEvent.click(modalSubmit)
            const dialog = await screen.getByRole('dialog')
            await waitFor(() => {
                expect(dialog).toHaveClass('is-visible')
            })
            expect(
                await screen.findByText(
                    'You must provide a reason for unlocking this submission'
                )
            ).toBeInTheDocument()
        })

        it('draws focus to unlock reason input when form validation errors exist', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK"
                    healthPlanPackage={mockSubmittedHealthPlanPackageWithRevisions()}
                />
            )

            await waitFor(() => handleOpen())
            screen.getByText('Provide reason for unlocking')

            const textbox = await screen.findByTestId('unlockSubmitModalInput')

            // submit without entering anything
            await userEvent.click(screen.getByTestId('unlock-modal-submit'))

            expect(
                await screen.findByText(
                    'You must provide a reason for unlocking this submission'
                )
            ).toBeInTheDocument()

            // check focus after error
            await waitFor(() => {
                expect(textbox).toHaveFocus()
            })
        })

        it('displays no modal alert banner error if unlock api request succeeds', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK"
                    healthPlanPackage={mockSubmittedHealthPlanPackage()}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            unlockHealthPlanPackageMockSuccess({
                                id: mockUnlockedHealthPlanPackage().id,
                                reason: 'Test unlock summary',
                            }),
                        ],
                    },
                }
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => {
                expect(dialog).toHaveClass('is-visible')
            })

            await userEvent.type(
                screen.getByTestId('unlockSubmitModalInput'),
                'Test unlock summary'
            )

            await userEvent.click(screen.getByTestId('unlock-modal-submit'))

            // the popup dialog should be hidden again
            await waitFor(() => {
                const dialog = screen.queryByRole('dialog')
                expect(dialog).toHaveClass('is-hidden')
            })

            expect(
                screen.queryByText(
                    'Error attempting to unlock. Submission may be already unlocked. Please refresh and try again.'
                )
            ).not.toBeInTheDocument()
        })

        it('displays modal alert banner error if unlock api request fails', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK"
                    healthPlanPackage={mockSubmittedHealthPlanPackage()}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            unlockHealthPlanPackageMockError({
                                id: mockUnlockedHealthPlanPackage().id,
                                reason: 'Test unlock summary',
                            }),
                        ],
                    },
                }
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            await userEvent.type(
                screen.getByTestId('unlockSubmitModalInput'),
                'Test unlock summary'
            )

            await userEvent.click(screen.getByTestId('unlock-modal-submit'))

            await waitFor(() => {
                const errorHeading = screen.queryByRole('heading', {
                    name: 'Unlock error',
                })
                const errorMessage = screen.queryByText(
                    'Error attempting to unlock.'
                )
                expect(errorHeading).toBeInTheDocument()
                expect(errorMessage).toBeInTheDocument()
            })
        })
        it('does not display modal alert banner error if unlock succeeds, but fails sending emails', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="UNLOCK"
                    healthPlanPackage={mockSubmittedHealthPlanPackage()}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            unlockHealthPlanPackageMockError({
                                id: mockUnlockedHealthPlanPackage().id,
                                reason: 'Test unlock summary',
                                error: {
                                    code: 'INTERNAL_SERVER_ERROR',
                                    cause: 'EMAIL_ERROR',
                                },
                            }),
                        ],
                    },
                }
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            await userEvent.type(
                screen.getByTestId('unlockSubmitModalInput'),
                'Test unlock summary'
            )

            await userEvent.click(screen.getByTestId('unlock-modal-submit'))

            await waitFor(() => {
                const errorHeading = screen.queryByRole('heading', {
                    name: 'Unlock error',
                })
                const errorMessage = screen.queryByText(
                    'Error attempting to unlock.'
                )
                expect(errorHeading).not.toBeInTheDocument()
                expect(errorMessage).not.toBeInTheDocument()
            })

            await waitFor(() => expect(dialog).toHaveClass('is-hidden'))
        })
    })

    describe('resubmit unlocked submission modal', () => {
        it('displays correct modal when submitting unlocked submission', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    healthPlanPackage={mockBaseContract()}
                    submissionName="Test-Submission"
                    modalType="RESUBMIT"
                    modalRef={modalRef}
                    setIsSubmitting={mockSetIsSubmitting}
                />
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            expect(screen.getByText('Summarize changes')).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Once you submit, this package will be sent to CMS for review and you will no longer be able to make changes.'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Provide summary of all changes made to this submission'
                )
            ).toBeInTheDocument()
            expect(
                screen.getByTestId('unlockSubmitModalInput')
            ).toBeInTheDocument()
            expect(
                screen.getByTestId('resubmit-modal-submit')
            ).toHaveTextContent('Resubmit')
        })
        it('displays form validation error when submitting without an submission summary', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    healthPlanPackage={mockBaseContract()}
                    submissionName="Test-Submission"
                    modalType="RESUBMIT"
                    modalRef={modalRef}
                    setIsSubmitting={mockSetIsSubmitting}
                />
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            expect(screen.getByRole('dialog')).toHaveClass('is-visible')
            expect(screen.getByText('Summarize changes')).toBeInTheDocument()

            await userEvent.click(screen.getByTestId('resubmit-modal-submit'))

            expect(
                await screen.findByText('You must provide a summary of changes')
            ).toBeInTheDocument()
        })
        it('draws focus to submitted summary textarea when form validation errors exist', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    healthPlanPackage={mockBaseContract()}
                    submissionName="Test-Submission"
                    modalType="RESUBMIT"
                    modalRef={modalRef}
                    setIsSubmitting={mockSetIsSubmitting}
                />
            )

            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            const textbox = await screen.getByTestId('unlockSubmitModalInput')

            // submit without entering anything
            await userEvent.click(screen.getByTestId('resubmit-modal-submit'))

            expect(
                await screen.findByText('You must provide a summary of changes')
            ).toBeInTheDocument()

            // check focus after error
            await waitFor(() => {
                expect(textbox).toHaveFocus()
            })
        })

        it('displays modal alert banner error if resubmit api request fails', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <UnlockSubmitModal
                    modalRef={modalRef}
                    modalType="RESUBMIT"
                    healthPlanPackage={mockBaseContract()}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            submitHealthPlanPackageMockError({
                                id: mockBaseContract().id,
                            }),
                        ],
                    },
                }
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            await userEvent.type(
                screen.getByTestId('unlockSubmitModalInput'),
                'Test unlock resubmit'
            )

            await userEvent.click(screen.getByTestId('resubmit-modal-submit'))

            await waitFor(() => {
                const errorHeading = screen.queryByRole('heading', {
                    name: 'Resubmission error',
                })

                expect(errorHeading).toBeInTheDocument()
            })
        })

        it('redirects if submission succeeds on unlocked plan package', async () => {
            let testLocation: Location
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)

            renderWithProviders(
                <UnlockSubmitModal
                    healthPlanPackage={mockBaseContract()}
                    submissionName="Test-Submission"
                    modalType="RESUBMIT"
                    modalRef={modalRef}
                    setIsSubmitting={mockSetIsSubmitting}
                />,
                {
                    apolloProvider: {
                        mocks: [
                            submitHealthPlanPackageMockSuccess({
                                id: mockBaseContract().id,
                                submittedReason: 'Test submission summary',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `draftSubmission/${
                            mockBaseContract().id
                        }/review-and-submit`,
                    },
                    location: (location) => (testLocation = location),
                }
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            await userEvent.type(
                screen.getByTestId('unlockSubmitModalInput'),
                'Test submission summary'
            )

            await userEvent.click(screen.getByTestId('resubmit-modal-submit'))

            await waitFor(() =>
                expect(screen.getByRole('dialog')).toHaveClass('is-hidden')
            )
            await waitFor(() =>
                expect(mockSetIsSubmitting).toHaveBeenCalledTimes(2)
            )
            await waitFor(() =>
                expect(testLocation.pathname).toBe(`/dashboard/submissions`)
            )
            await waitFor(() =>
                expect(testLocation.search).toBe(
                    '?justSubmitted=Test-Submission'
                )
            )
        })
    })
})
