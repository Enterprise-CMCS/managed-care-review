import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { PageHeadingRow } from './PageHeadingRow'

describe('Page Heading Row', () => {
    const loggedInUser = {
        __typename: 'StateUser' as const,
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
        renderWithProviders(<PageHeadingRow />)
        expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('does not display heading text when isLoading', async () => {
        renderWithProviders(<PageHeadingRow isLoading />)

        expect(screen.getByRole('heading')).toBeInTheDocument()
        expect(screen.getByRole('heading')).not.toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
    })

    it('displays Medicaid and CHIP Managed Care Reporting heading when logged out', () => {
        renderWithProviders(<PageHeadingRow heading="Custom page heading" />)
        expect(screen.getByRole('heading')).toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
    })

    it('displays custom heading for page when loggedInUser exists', () => {
        renderWithProviders(
            <PageHeadingRow
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
