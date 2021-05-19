import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../testHelpers/jestHelpers'
import { PageActions } from './PageActions'

describe('PageActions', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <PageActions primaryAction="Save" secondaryAction="Back" />
        )

        await waitFor(() => {
            expect(screen.getByText('Save as draft')).toBeInTheDocument()
            expect(screen.getByText('Save')).toBeInTheDocument()
            expect(screen.getByText('Back')).toBeInTheDocument()
        })
    })
})
