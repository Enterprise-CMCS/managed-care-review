import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { createMemoryHistory } from 'history'

import {
    fetchCurrentUserMock,
    mockDraftSubmission,
    submitDraftSubmissionMockSuccess,
    submitDraftSubmissionMockError,
} from '../../../testHelpers/apolloHelpers'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { ReviewSubmit } from './ReviewSubmit'

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockDraftSubmission} />,
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
        })
    })

    it('renders info from a DraftSubmission', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockDraftSubmission} />,
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

            const submissionDescription = screen.queryByText(
                'A real submission'
            )
            expect(submissionDescription).toBeInTheDocument()
        })
    })

    it('displays back link', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockDraftSubmission} />,
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
            <ReviewSubmit draftSubmission={mockDraftSubmission} />,
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

    it('redirects if submission succeeds', async () => {
        const history = createMemoryHistory()

        renderWithProviders(
            <ReviewSubmit draftSubmission={mockDraftSubmission} />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockSuccess({
                            id: mockDraftSubmission.id,
                        }),
                    ],
                },
                routerProvider: {
                    route: `draftSubmission/${mockDraftSubmission.id}/review`,
                    routerProps: {
                        history,
                    },
                },
            }
        )

        const submitButton = await screen.findByRole('button', {
            name: 'Submit',
        })

        submitButton.click()

        await waitFor(() => {
            expect(history.location.pathname).toEqual('/dashboard')
        })
    })

    it('displays an error if submission fails', async () => {
        renderWithProviders(
            <ReviewSubmit draftSubmission={mockDraftSubmission} />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        submitDraftSubmissionMockError({
                            id: mockDraftSubmission.id,
                        }),
                    ],
                },
            }
        )

        const submitButton = await screen.findByRole('button', {
            name: 'Submit',
        })

        submitButton.click()

        const errorText = await screen.findByText(
            'Error: Error attempting to submit. Please try again.'
        )

        expect(errorText).toBeInTheDocument()
    })
})
