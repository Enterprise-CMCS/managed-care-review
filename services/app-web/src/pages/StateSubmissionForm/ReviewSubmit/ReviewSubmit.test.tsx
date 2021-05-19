import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import {
    fetchCurrentUserMock,
    mockDraftSubmission,
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
})
