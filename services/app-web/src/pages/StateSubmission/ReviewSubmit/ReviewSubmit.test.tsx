import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { createMemoryHistory } from 'history'

import {
    fetchCurrentUserMock,
    mockCompleteDraft,
    submitDraftSubmissionMockSuccess,
    submitDraftSubmissionMockError,
} from '../../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ReviewSubmit } from './ReviewSubmit'

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} />,
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

    it('renders info from a DraftSubmission', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} />,
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
                screen.getByRole('heading', { name: 'Documents' })
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

    it('displays back link', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('link', {
                    name: 'Back',
                })
            ).toBeDefined()
        )
    })

    it('displays submit button', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'Submit',
                })
            ).toBeDefined()
        )
    })

    it('submit button opens confirmation modal', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockCompleteDraft()} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        const submitButton = screen.getByRole('button', {
            name: 'Submit',
        })

        expect(submitButton).toBeInTheDocument()

        submitButton.click()

        await waitFor(() => {
            const confirmSubmit = screen.getByRole('button', {
                name: 'Confirm submit',
            })
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
            <ReviewSubmit draftSubmission={mockCompleteDraft()} />,
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

        const submit = screen.getByRole('button', {
            name: 'Submit',
        })
        submit.click()

        await waitFor(() => {
            const confirmSubmit = screen.getByRole('button', {
                name: 'Confirm submit',
            })
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
            <ReviewSubmit draftSubmission={mockCompleteDraft()} />,
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

        const submitButton = await screen.findByRole('button', {
            name: 'Submit',
        })

        submitButton.click()

        const confirmSubmit = await screen.findByRole('button', {
            name: 'Confirm submit',
        })
        expect(confirmSubmit).toBeInTheDocument()
        confirmSubmit.click()

        const errorText = await screen.findByText(
            'Error attempting to submit. Please try again.'
        )

        expect(errorText).toBeInTheDocument()
    })
})
