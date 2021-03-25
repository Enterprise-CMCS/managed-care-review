import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import { getCurrentUserMock } from '../../../utils/apolloUtils'
import { renderWithProviders } from '../../../utils/jestUtils'
import { ReviewSubmit } from './ReviewSubmit'

describe('ReviewSubmit', () => {
    it('renders without errors', async () => {
        renderWithProviders(<ReviewSubmit />, {
            apolloProvider: {
                mocks: [getCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Contract details' })
            ).toBeInTheDocument()

            expect(
                screen.getByRole('heading', { name: 'State contacts' })
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
})
