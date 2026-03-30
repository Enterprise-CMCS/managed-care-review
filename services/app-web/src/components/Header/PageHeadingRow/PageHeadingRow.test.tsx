import { screen, waitFor } from '@testing-library/react'
import { CmsUser, StateUser } from '../../../gen/gqlClient'
import { renderWithProviders } from '../../../testHelpers'
import { PageHeadingRow } from './PageHeadingRow'
import { StateHeading } from './StateHeading'
import { fetchCurrentUserMock } from '@mc-review/mocks'

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

    it('renders without errors and with the managed care header on the landing page', async () => {
        renderWithProviders(<PageHeadingRow route="ROOT" />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })
        await waitFor(() => {
            expect(screen.getByRole('heading')).toBeInTheDocument()
        })
    })

    it('renders without errors and without the managed care header on the help page page', async () => {
        renderWithProviders(<PageHeadingRow route="HELP" />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })
        await waitFor(() => {
            expect(screen.queryByRole('heading')).not.toBeInTheDocument()
        })
    })

    it('does not display heading text when isLoading', async () => {
        renderWithProviders(<PageHeadingRow isLoading route="ROOT" />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() => {
            expect(screen.getByRole('heading')).toBeInTheDocument()
            expect(screen.getByRole('heading')).not.toHaveTextContent(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
        })
    })

    it('displays Medicaid and CHIP Managed Care Reporting heading when logged out', async () => {
        renderWithProviders(
            <PageHeadingRow heading="Custom page heading" route="ROOT" />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            expect(screen.getByRole('heading')).toHaveTextContent(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
        })
    })

    it('displays custom heading for page when loggedInStateUser exists', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInStateUser}
                route="ROOT"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            expect(screen.getByRole('heading')).not.toHaveTextContent(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
            expect(screen.getByRole('heading')).toHaveTextContent(
                'Custom page heading'
            )
        })
    })

    it('displays EQRO contract type on EQRO submission page', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading={
                    <StateHeading
                        subHeaderText="Some-id"
                        stateCode="OH"
                        stateName="Ohio"
                        contractType="EQRO"
                        route="SUBMISSIONS_SUMMARY"
                    />
                }
                loggedInUser={loggedInStateUser}
                route="SUBMISSIONS_SUMMARY"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByTestId('contractType')).toHaveTextContent('EQRO')
        })
    })

    it('displays Health plan contract type on hpp submission page', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading={
                    <StateHeading
                        subHeaderText="Some-id"
                        stateCode="OH"
                        stateName="Ohio"
                        contractType="Health plan"
                        route="SUBMISSIONS_SUMMARY"
                    />
                }
                loggedInUser={loggedInStateUser}
                route="SUBMISSIONS_SUMMARY"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByTestId('contractType')).toHaveTextContent(
                'Health plan'
            )
        })
    })

    it('does not display submission ID or contract type on dashboard', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInStateUser}
                route="DASHBOARD_SUBMISSIONS"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('contractType')).not.toBeInTheDocument()
            expect(
                screen.queryByTestId('submission-id')
            ).not.toBeInTheDocument()
        })
    })

    it('does not display submission ID or contract type on new submission page', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInStateUser}
                route="SUBMISSIONS_NEW"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('contractType')).not.toBeInTheDocument()
            expect(
                screen.queryByTestId('submission-id')
            ).not.toBeInTheDocument()
        })
    })
    it('displays state information for CMS user on submission summary', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading={
                    <StateHeading
                        subHeaderText="Some-id"
                        stateCode="OH"
                        stateName="Ohio"
                        contractType="Health plan"
                        route="SUBMISSIONS_SUMMARY"
                    />
                }
                loggedInUser={loggedInCMSUser}
                route="SUBMISSIONS_SUMMARY"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.getByTestId('stateDisplay')).toHaveTextContent('Ohio')
        })
    })
    it('does not display state information for CMS user on the dashboard', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInCMSUser}
                route="SUBMISSIONS_SUMMARY"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            expect(screen.queryByTestId('stateDisplay')).not.toBeInTheDocument()
        })
    })
    it('does not display state information for CMS user on the settings page', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInCMSUser}
                route="SUBMISSIONS_SUMMARY"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )
        await waitFor(() => {
            expect(screen.queryByTestId('stateDisplay')).not.toBeInTheDocument()
        })
    })
    it('does not display state information for CMS user when stateCode is undefined', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInCMSUser}
                route="SUBMISSIONS_SUMMARY"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('stateDisplay')).not.toBeInTheDocument()
            expect(screen.getByRole('heading')).toHaveTextContent('CMS')
        })
    })

    it('does not display state information for CMS user when stateName is undefined', async () => {
        renderWithProviders(
            <PageHeadingRow
                heading="Custom page heading"
                loggedInUser={loggedInCMSUser}
                route="SUBMISSIONS_SUMMARY"
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(screen.queryByTestId('stateDisplay')).not.toBeInTheDocument()
            expect(screen.getByRole('heading')).toHaveTextContent('CMS')
        })
    })
})
