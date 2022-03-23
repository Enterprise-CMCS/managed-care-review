import { screen, waitFor } from '@testing-library/react'
import { createMemoryHistory } from 'history'
import {
    fetchCurrentUserMock,
    mockCompleteDraft,
    submitDraftSubmissionMockError,
    submitDraftSubmissionMockSuccess,
} from '../../../testHelpers/apolloHelpers'
import { renderWithProviders, userClickByTestId } from '../../../testHelpers/jestHelpers'
import { ReviewSubmit } from './ReviewSubmit'
import userEvent from '@testing-library/user-event'

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false}/>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        expect(
            screen.getByRole('heading', { name: 'Contract details' })
        ).toBeInTheDocument()
    })

    it('displays edit buttons for every section', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false}/>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )
        })
    })

    it('does not display zip download buttons', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            const bulkDownloadButtons = screen.queryAllByRole('button', {
                name: /documents/,
            })
            expect(bulkDownloadButtons.length).toBe(0)
        })
    })

    it('renders info from a DraftSubmission', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('heading', { name: 'State contacts' })
            ).toBeInTheDocument()

            const sectionHeadings = screen.queryAllByRole('heading', {
                level: 2,
            })
            const editButtons = screen.queryAllByRole('button', {
                name: 'Edit',
            })
            expect(sectionHeadings.length).toBeGreaterThanOrEqual(
                editButtons.length
            )

            const submissionDescription =
                screen.queryByText('A real submission')
            expect(submissionDescription).toBeInTheDocument()
        })
    })

    it('displays back and save as draft buttons', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false}/>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'Back',
                })
            ).toBeDefined()
        )
        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'Save as draft',
                })
            ).toBeDefined()
        )
    })

    it('displays submit button', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false}/>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(screen.getByTestId('form-submit')).toBeDefined()
        )
    })

    it('submit button opens confirmation modal', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false}/>,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const submitButton = screen.getByTestId('form-submit')

        expect(submitButton).toBeInTheDocument()

        submitButton.click()

        await waitFor(() => {
            const confirmSubmit = screen.getByTestId('review-and-submit-modal-submit')
            expect(confirmSubmit).toBeInTheDocument()
            expect(screen.getByText('Ready to submit?')).toBeInTheDocument()
            expect(
                screen.getByText(
                    'Submitting this package will send it to CMS to begin their review.'
                )
            ).toBeInTheDocument()
        })
    })

    it('redirects if submission succeeds', async () => {
        const history = createMemoryHistory()

        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false}/>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockSuccess({
                            id: mockCompleteDraft().id,
                        }),
                    ],
                },
                routerProvider: {
                    route: `draftSubmission/${
                        mockCompleteDraft().id
                    }/review-and-submit`,
                    routerProps: {
                        history,
                    },
                },
            }
        )

        const submit = screen.getByTestId('review-and-submit-modal-submit')
        submit.click()

        await waitFor(() => {
            const confirmSubmit = screen.getByTestId('review-and-submit-modal-submit')
            expect(confirmSubmit).toBeInTheDocument()
            confirmSubmit.click()
        })

        await waitFor(() => {
            expect(history.location.pathname).toEqual(`/dashboard`)
            expect(history.location.search).toEqual(
                `?justSubmitted=${mockCompleteDraft().name}`
            )
        })
    })

    it('displays an error if submission fails', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={false}/>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockError({
                            id: mockCompleteDraft().id,
                        }),
                    ],
                },
            }
        )

        const submitButton = screen.getByTestId('form-submit')

        submitButton.click()

        const confirmSubmit = screen.getByTestId('review-and-submit-modal-submit')
        expect(confirmSubmit).toBeInTheDocument()
        confirmSubmit.click()

        const errorText = await screen.findByText(
            'Error attempting to submit. Please try again.'
        )

        expect(errorText).toBeInTheDocument()
    })

    it('opens submission modal with summary input when submit button is clicked on unlocked plan package', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={true}/>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockError({
                            id: mockCompleteDraft().id,
                        }),
                    ],
                },
            }
        )
        screen.getByTestId('form-submit').click()

        await waitFor(() => {
            expect(screen.getByTestId('review-and-submit-modal-submit')).toBeInTheDocument()
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
            expect(screen.getByTestId('review-and-submit-modal-submit')).toHaveTextContent('Resubmit')
        })
    })

    it('redirects if submission succeeds on unlocked plan package', async () => {
        const history = createMemoryHistory()

        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={true}/>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockSuccess({
                            id: mockCompleteDraft().id,
                            submittedReason: 'Test submission summary'
                        }),
                    ],
                },
                routerProvider: {
                    route: `draftSubmission/${
                        mockCompleteDraft().id
                    }/review-and-submit`,
                    routerProps: {
                        history,
                    },
                },
            }
        )
        screen.getByTestId('form-submit').click()

        userEvent.type(
            screen.getByTestId('submittedReason'),
            'Test submission summary'
        )

        screen.getByTestId('review-and-submit-modal-submit').click()

        // the popup dialog should be hidden again
        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveClass('is-hidden')
        })

        await waitFor(() => {
            expect(history.location.pathname).toEqual(`/dashboard`)
            expect(history.location.search).toEqual(
                `?justSubmitted=${mockCompleteDraft().name}`
            )
        })
    })

    it('displays an error if submission fails on unlocked plan package', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={true}/>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockError({
                            id: mockCompleteDraft().id,
                        }),
                    ],
                },
            }
        )
        screen.getByTestId('form-submit').click()

        userEvent.type(
            screen.getByTestId('submittedReason'),
            'Test submission summary'
        )

        screen.getByTestId('review-and-submit-modal-submit').click()

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveClass('is-hidden')
        })

        expect(await screen.findByText(
            'Error attempting to submit. Please try again.'
        )).toBeInTheDocument()
    })

    it('displays form validation error when summary for submission is over 300 characters', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={true}/>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockSuccess({
                            id: mockCompleteDraft().id,
                            submittedReason: 'Test submission summary'
                        }),
                    ],
                },
            }
        )
        screen.getByTestId('form-submit').click()

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveClass('is-visible')
            expect(screen.getByText('Summarize changes')).toBeInTheDocument()
        })

        // Don't use userEvent.type here because it messes with jest timers with this length of content
        userEvent.paste(
            screen.getByTestId('submittedReason'),
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin vulputate ultricies suscipit. Suspendisse consequat at mauris a iaculis. Praesent lorem massa, pellentesque et tempor et, laoreet quis lectus. Vestibulum finibus condimentum nulla, vel tristique tellus pretium sollicitudin. Curabitur velit enim, pulvinar eu fermentum vel, fringilla quis leo.'
        )

        screen.getByTestId('review-and-submit-modal-submit').click()

        expect(
            await screen.findByText(
                'Summary for submission is too long'
            )
        ).toBeInTheDocument()
    })

    it('displays form validation error when submitting without an submission summary', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={true}/>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockSuccess({
                            id: mockCompleteDraft().id,
                            submittedReason: 'Test submission summary'
                        }),
                    ],
                },
            }
        )
        screen.getByTestId('form-submit').click()

        await waitFor(() => {
            expect(screen.getByRole('dialog')).toHaveClass('is-visible')
            expect(screen.getByText('Summarize changes')).toBeInTheDocument()
        })

        screen.getByTestId('review-and-submit-modal-submit').click()

        expect(
            await screen.findByText(
                'Summary for submission is required'
            )
        ).toBeInTheDocument()
    })

    it('draws focus to submitted summary textarea when form validation errors exist', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} unlocked={true}/>,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockSuccess({
                            id: mockCompleteDraft().id
                        }),
                    ],
                },
            }
        )
        userClickByTestId(screen, 'form-submit')

        // the popup dialog should be visible now
        await waitFor(() =>  screen.getByText('Provide summary of all changes made to this submission'))

        // Using findBy because it seems like the timeout in findBy gives it enough time to find the textarea?
        const textbox = await screen.findByTestId('submittedReason')
        expect(textbox).toBeInTheDocument()

        // submit without entering anything
        userClickByTestId(screen, 'review-and-submit-modal-submit')

        expect(
            await screen.findByText(
                'Summary for submission is required'
            )
        ).toBeInTheDocument()

        // check focus after error
        expect(textbox).toHaveFocus()
    })
})
