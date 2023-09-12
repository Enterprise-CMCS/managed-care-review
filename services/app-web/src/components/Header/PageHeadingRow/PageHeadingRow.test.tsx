import { screen } from '@testing-library/react'
import { StateUser } from '../../../gen/gqlClient'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { PageHeadingRow } from './PageHeadingRow'

describe('Page Heading Row', () => {
    const loggedInUser: StateUser = {
        __typename: 'StateUser' as const,
        state: {
            name: 'Minnesota',
            code: 'MN',
            programs: [
                {
                    id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                    fullName: 'Special Needs Basic Care',
                    name: 'SNBC',
                },
                {
                    id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                    fullName: 'Prepaid Medical Assistance Program',
                    name: 'PMAP',
                },
                {
                    id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                    fullName: 'Minnesota Senior Care Plus ',
                    name: 'MSC+',
                },
                {
                    id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                    fullName: 'Minnesota Senior Health Options',
                    name: 'MSHO',
                },
            ],
        },
        id: 'foo-id',
        givenName: 'Bob',
        familyName: 'Dumas',
        role: 'State User',
        email: 'bob@dmas.mn.gov',
    }
    it('renders without errors and with the managed care header on the landing page', () => {
        renderWithProviders(<PageHeadingRow route="ROOT" />)
        expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('renders without errors and without the managed care header on the help page page', () => {
        renderWithProviders(<PageHeadingRow route="ROOT" />)
        expect(screen.getByRole('heading')).toBeInTheDocument()
        expect(screen.getByRole('heading')).not.toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
    })

    it('does not display heading text when isLoading', async () => {
        renderWithProviders(<PageHeadingRow isLoading route="ROOT" />)

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
