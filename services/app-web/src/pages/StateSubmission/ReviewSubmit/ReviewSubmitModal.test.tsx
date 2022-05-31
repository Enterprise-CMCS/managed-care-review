import { createRef } from 'react'
import { ModalRef } from '@trussworks/react-uswds'
import { screen, waitFor } from '@testing-library/react'
import {
    fetchCurrentUserMock,
    mockCompleteDraft,
    submitHealthPlanPackageMockError,
} from '../../../testHelpers/apolloHelpers'
import { ReviewSubmitModal } from './ReviewSubmitModal'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import userEvent from '@testing-library/user-event'

describe('ReviewSubmitModal', () => {
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
                isSubmitting={jest.fn()}
            />
        )
        await waitFor(() => handleOpen())
        const dialog = screen.getByRole('dialog')
        await waitFor(() => expect(dialog).toHaveClass('is-visible'))
    })

    it('displays correct modal when submitting unlocked submission', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        renderWithProviders(
            <ReviewSubmitModal
                draftSubmission={mockCompleteDraft()}
                submissionName="Test-Submission"
                unlocked={true}
                modalRef={modalRef}
                showError={jest.fn()}
                isSubmitting={jest.fn()}
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

    it('displays correct modal when submitting initial submission', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        renderWithProviders(
            <ReviewSubmitModal
                draftSubmission={mockCompleteDraft()}
                submissionName="Test-Submission"
                unlocked={false}
                modalRef={modalRef}
                showError={jest.fn()}
                isSubmitting={jest.fn()}
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

    it('displays form validation error when submitting without an submission summary', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        renderWithProviders(
            <ReviewSubmitModal
                draftSubmission={mockCompleteDraft()}
                submissionName="Test-Submission"
                unlocked
                modalRef={modalRef}
                showError={jest.fn()}
                isSubmitting={jest.fn()}
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
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        renderWithProviders(
            <ReviewSubmitModal
                draftSubmission={mockCompleteDraft()}
                submissionName="Test-Submission"
                unlocked
                modalRef={modalRef}
                showError={jest.fn()}
                isSubmitting={jest.fn()}
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

    it('returns an error if submission fails on resubmitting', async () => {
        const modalRef = createRef<ModalRef>()
        const handleOpen = () => modalRef.current?.toggleModal(undefined, true)
        let errorText: string
        renderWithProviders(
            <ReviewSubmitModal
                draftSubmission={mockCompleteDraft()}
                submissionName="Test-Submission"
                unlocked
                modalRef={modalRef}
                showError={jest.fn((error: string) => {
                    errorText = error
                })}
                isSubmitting={jest.fn()}
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
        })
    })
})
