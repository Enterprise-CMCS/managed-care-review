import { screen } from '@testing-library/react'
import { CmsUser, StateUser } from '../../../gen/gqlClient'
import { renderWithProviders } from '../../../testHelpers/jestHelpers'
import { PageHeadingRow } from './PageHeadingRow'

describe('Page Heading Row', () => {
    const loggedInStateUser: StateUser = {
        __typename: 'StateUser' as const,
        state: {
            name: 'Minnesota',
            code: 'MN',
            programs: [
                {
                    id: 'abbdf9b0-c49e-4c4c-bb6f-040cb7b51cce',
                    fullName: 'Special Needs Basic Care',
                    name: 'SNBC',
                    isRateProgram: false,
                },
                {
                    id: 'd95394e5-44d1-45df-8151-1cc1ee66f100',
                    fullName: 'Prepaid Medical Assistance Program',
                    name: 'PMAP',
                    isRateProgram: false,
                },
                {
                    id: 'ea16a6c0-5fc6-4df8-adac-c627e76660ab',
                    fullName: 'Minnesota Senior Care Plus ',
                    name: 'MSC+',
                    isRateProgram: false,
                },
                {
                    id: '3fd36500-bf2c-47bc-80e8-e7aa417184c5',
                    fullName: 'Minnesota Senior Health Options',
                    name: 'MSHO',
                    isRateProgram: false,
                },
            ],
        },
        id: 'foo-id',
        givenName: 'Bob',
        familyName: 'Dumas',
        role: 'State User',
        email: 'bob@dmas.mn.gov',
    }

    const loggedInCMSUser: CmsUser = {
        __typename: 'CMSUser' as const,
        id: 'foo-id',
        givenName: 'Bob',
        familyName: 'Dumas',
        role: 'CMS_USER',
        email: 'bob@dmas.mn.gov',
        divisionAssignment: 'DMCO',
        stateAssignments: [
            {
                code: 'OH',
                name: 'Ohio',
                programs: [],
            },
        ],
    }

    it('renders without errors and with the managed care header on the landing page', () => {
        renderWithProviders(<PageHeadingRow route="ROOT" />)
        expect(screen.getByRole('heading')).toBeInTheDocument()
    })

    it('renders without errors and without the managed care header on the help page page', () => {
        renderWithProviders(<PageHeadingRow route="HELP" />)
        expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    })

    it('does not display heading text when isLoading', async () => {
        renderWithProviders(<PageHeadingRow isLoading route="ROOT" />)

        expect(screen.getByRole('heading')).toBeInTheDocument()
        expect(screen.getByRole('heading')).not.toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
    })

    it('displays Medicaid and CHIP Managed Care Reporting heading when logged out', () => {
        renderWithProviders(
            <PageHeadingRow heading="Custom page heading" route="ROOT" />
        )
        expect(screen.getByRole('heading')).toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
    })

    it('displays custom heading for page when loggedInStateUser exists', () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInStateUser}
                route="ROOT"
            />
        )
        expect(screen.getByRole('heading')).not.toHaveTextContent(
            'Medicaid and CHIP Managed Care Reporting and Review System'
        )
        expect(screen.getByRole('heading')).toHaveTextContent(
            'Custom page heading'
        )
    })

    it('displays EQRO contract type on EQRO submission page', () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInStateUser}
                route="SUBMISSIONS_SUMMARY"
                pathname="/submissions/eqro/1234"
            />
        )

        expect(screen.getByTestId('contractType')).toHaveTextContent('EQRO')
    })

    it('displays Health plan contract type on hpp submission page', () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInStateUser}
                route="SUBMISSIONS_SUMMARY"
                pathname="/submissions/health-plan/1234"
            />
        )

        expect(screen.getByTestId('contractType')).toHaveTextContent(
            'Health plan'
        )
    })

    it('does not display submission ID or contract type on dashboard', () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInStateUser}
                route="DASHBOARD_SUBMISSIONS"
                pathname="/submissions/dashboard"
            />
        )

        expect(screen.queryByTestId('contractType')).not.toBeInTheDocument()
        expect(screen.queryByTestId('submission-id')).not.toBeInTheDocument()
    })

    it('does not display submission ID or contract type on new submission page', () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInStateUser}
                route="SUBMISSIONS_NEW"
                pathname="/submissions/new"
            />
        )

        expect(screen.queryByTestId('contractType')).not.toBeInTheDocument()
        expect(screen.queryByTestId('submission-id')).not.toBeInTheDocument()
    })
    it('displays state information for CMS user on submission summary', () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInCMSUser}
                route="SUBMISSIONS_SUMMARY"
                pathname="/submissions/eqro/1234"
                stateCode="OH"
                stateName="Ohio"
            />
        )
        expect(screen.getByTestId('stateDisplay')).toHaveTextContent('Ohio')
    })
    it('does not display state information for CMS user on the dashboard', () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInCMSUser}
                route="SUBMISSIONS_SUMMARY"
                pathname="/dashboard"
            />
        )
        expect(screen.queryByTestId('stateDisplay')).not.toBeInTheDocument()
    })
    it('does not display state information for CMS user on the settings page', () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInCMSUser}
                route="SUBMISSIONS_SUMMARY"
                pathname="/mc-review-settings"
            />
        )
        expect(screen.queryByTestId('stateDisplay')).not.toBeInTheDocument()
    })
})
