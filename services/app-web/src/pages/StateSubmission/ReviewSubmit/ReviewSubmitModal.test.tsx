import { createRef } from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { screen, waitFor } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    mockCompleteDraft,
    submitHealthPlanPackageMockError,
    submitHealthPlanPackageMockSuccess,
} from '../../../testHelpers/apolloHelpers'
import { ReviewSubmitModal } from './ReviewSubmitModal'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import userEvent from '@testing-library/user-event'
import { Location } from 'history'
import { Route } from 'react-router-dom'

describe('ReviewSubmitModal', () => {
    const mockSetIsSubmitting = jest.fn()

    it('renders without errors', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        renderWithProviders(
            <ReviewSubmitModal
                draftSubmission={mockCompleteDraft()}
                submissionName="Test-Submission"
                unlocked={true}
                modalRef={modalRef}
                showError={jest.fn()}
                isSubmitting={mockSetIsSubmitting}
            />
        )
        await waitFor(() => handleOpen())
        const dialog = screen.getByRole('dialog')
        await waitFor(() => expect(dialog).toHaveClass('is-visible'))
    })

    it('returns an error if submission fails on resubmitting', async () => {
        const modalRef = createRef<ModalRef>()
        let errorText: string
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        const mockSetShowError = jest.fn((error: string) => (errorText = error))
        renderWithProviders(
            <ReviewSubmitModal
                draftSubmission={mockCompleteDraft()}
                submissionName="Test-Submission"
                unlocked
                modalRef={modalRef}
                showError={mockSetShowError}
                isSubmitting={mockSetIsSubmitting}
            />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitHealthPlanPackageMockError({
                            id: mockCompleteDraft().id,
                        }),
                    ],
                },
            }
        )
        await waitFor(() => handleOpen())
        const dialog = screen.getByRole('dialog')
        await waitFor(() => expect(dialog).toHaveClass('is-visible'))

        userEvent.type(
            screen.getByTestId('submittedReason'),
            'Test submission summary'
        )

        screen.getByTestId('review-and-submit-modal-submit').click()

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveClass('is-hidden')
            expect(errorText).toBe(
                'Error attempting to submit. Please try again.'
            )
            expect(mockSetIsSubmitting).toHaveBeenCalledTimes(2)
            expect(mockSetShowError).toHaveBeenCalledTimes(1)
        })
    })

    describe('Initial submission modal', () => {
        it('displays correct modal when submitting initial submission', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <ReviewSubmitModal
                    draftSubmission={mockCompleteDraft()}
                    submissionName="Test-Submission"
                    unlocked={false}
                    modalRef={modalRef}
                    showError={jest.fn()}
                    isSubmitting={mockSetIsSubmitting}
                />
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            const confirmSubmit = screen.getByTestId(
                'review-and-submit-modal-submit'
            )
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
            const mockSetShowError = jest.fn()
            renderWithProviders(
                <>
                    <Route
                        path="*"
                        render={({ location }) => {
                            testLocation = location as Location
                            return null
                        }}
                    ></Route>
                    <ReviewSubmitModal
                        draftSubmission={mockCompleteDraft()}
                        submissionName="Test-Submission"
                        unlocked={false}
                        modalRef={modalRef}
                        showError={mockSetShowError}
                        isSubmitting={mockSetIsSubmitting}
                    />
                </>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            submitHealthPlanPackageMockSuccess({
                                id: mockCompleteDraft().id,
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `draftSubmission/${
                            mockCompleteDraft().id
                        }/review-and-submit`,
                    },
                }
            )

            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            screen.getByTestId('review-and-submit-modal-submit').click()

            await waitFor(() => {
                expect(testLocation.pathname).toBe(`/dashboard`)
                expect(testLocation.search).toBe(
                    `?justSubmitted=Test-Submission`
                )
            })
        })
    })

    describe('Resubmitting plan packages modal', () => {
        it('displays correct modal when submitting unlocked submission', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <ReviewSubmitModal
                    draftSubmission={mockCompleteDraft()}
                    submissionName="Test-Submission"
                    unlocked={true}
                    modalRef={modalRef}
                    showError={jest.fn()}
                    isSubmitting={mockSetIsSubmitting}
                />
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            expect(
                screen.getByTestId('review-and-submit-modal-submit')
            ).toBeInTheDocument()
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
            expect(screen.getByTestId('submittedReason')).toBeInTheDocument()
            expect(
                screen.getByTestId('review-and-submit-modal-submit')
            ).toHaveTextContent('Resubmit')
        })

        it('displays form validation error when submitting without an submission summary', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <ReviewSubmitModal
                    draftSubmission={mockCompleteDraft()}
                    submissionName="Test-Submission"
                    unlocked
                    modalRef={modalRef}
                    showError={jest.fn()}
                    isSubmitting={mockSetIsSubmitting}
                />
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            expect(screen.getByRole('dialog')).toHaveClass('is-visible')
            expect(screen.getByText('Summarize changes')).toBeInTheDocument()
            screen.getByTestId('review-and-submit-modal-submit').click()

            expect(
                await screen.findByText('You must provide a summary of changes')
            ).toBeInTheDocument()
        })

        it('draws focus to submitted summary textarea when form validation errors exist', async () => {
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            renderWithProviders(
                <ReviewSubmitModal
                    draftSubmission={mockCompleteDraft()}
                    submissionName="Test-Submission"
                    unlocked
                    modalRef={modalRef}
                    showError={jest.fn()}
                    isSubmitting={mockSetIsSubmitting}
                />
            )

            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            const textbox = await screen.getByTestId('submittedReason')

            // submit without entering anything
            screen.getByTestId('review-and-submit-modal-submit').click()

            expect(
                await screen.findByText('You must provide a summary of changes')
            ).toBeInTheDocument()

            // check focus after error
            expect(textbox).toHaveFocus()
        })

        it('redirects if submission succeeds on unlocked plan package', async () => {
            let testLocation: Location
            const modalRef = createRef<ModalRef>()
            const handleOpen = () =>
                modalRef.current?.toggleModal(undefined, true)
            const mockSetShowError = jest.fn()
            renderWithProviders(
                <>
                    <Route
                        path="*"
                        render={({ location }) => {
                            testLocation = location as Location
                            return null
                        }}
                    ></Route>
                    <ReviewSubmitModal
                        draftSubmission={mockCompleteDraft()}
                        submissionName="Test-Submission"
                        unlocked
                        modalRef={modalRef}
                        showError={mockSetShowError}
                        isSubmitting={mockSetIsSubmitting}
                    />
                </>,
                {
                    apolloProvider: {
                        mocks: [
                            fetchCurrentUserMock({ statusCode: 200 }),
                            submitHealthPlanPackageMockSuccess({
                                id: mockCompleteDraft().id,
                                submittedReason: 'Test submission summary',
                            }),
                        ],
                    },
                    routerProvider: {
                        route: `draftSubmission/${
                            mockCompleteDraft().id
                        }/review-and-submit`,
                    },
                }
            )
            await waitFor(() => handleOpen())
            const dialog = screen.getByRole('dialog')
            await waitFor(() => expect(dialog).toHaveClass('is-visible'))

            userEvent.type(
                screen.getByTestId('submittedReason'),
                'Test submission summary'
            )

            screen.getByTestId('review-and-submit-modal-submit').click()

            await waitFor(() => {
                expect(screen.getByRole('dialog')).toHaveClass('is-hidden')
                expect(mockSetIsSubmitting).toHaveBeenCalledTimes(1)
                expect(mockSetShowError).toHaveBeenCalledTimes(0)
                expect(testLocation.pathname).toBe(`/dashboard`)
                expect(testLocation.search).toBe(
                    '?justSubmitted=Test-Submission'
                )
            })
        })
    })
})
