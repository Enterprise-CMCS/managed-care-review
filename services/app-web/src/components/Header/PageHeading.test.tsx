import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../utils/jestUtils'
import { mockGetCurrentUser200 } from '../../utils/apolloUtils'
import { PageHeading } from './PageHeading'

describe('Page Heading', () => {
    const loggedInUser = {
        state: {
            name: 'Minnesota',
            code: 'MN',
            programs: [
                { id: 'msho', name: 'MSHO' },
                { id: 'pmap', name: 'PMAP' },
                { id: 'snbc', name: 'SNBC' },
            ],
        },
        role: 'State User',
        name: 'Bob it user',
        email: 'bob@dmas.mn.gov',
    }
    it('renders without errors', () => {
        renderWithProviders(<PageHeading />)
        expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('does not display heading text when isLoading', async () => {
        renderWithProviders(<PageHeading isLoading />)

        expect(screen.getByRole('heading')).toBeInTheDocument()
        expect(screen.getByRole('heading')).not.toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
    })

    it('displays Medicaid and CHIP Managed Care Reporting heading when logged out', () => {
        renderWithProviders(<PageHeading heading="Custom page heading" />)
        expect(screen.getByRole('heading')).toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
    })

    it('displays custom heading for page when loggedInUser exists', () => {
        renderWithProviders(
            <PageHeading
                heading="Custom page heading"
                loggedInUser={loggedInUser}
            />
        )
        expect(screen.getByRole('heading')).not.toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
        expect(screen.getByRole('heading')).toHaveTextContent(
            'Custom page heading'
        )
    })
})
