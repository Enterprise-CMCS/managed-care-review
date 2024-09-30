import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import {
    fetchCurrentUserMock,
    fetchMcReviewSettingsMock,
    indexUsersQueryMock,
    mockValidAdminUser,
    mockValidBusinessOwnerUser,
    mockValidCMSApproverUser,
    mockValidCMSUser,
    mockValidHelpDeskUser,
    mockValidStateUser,
} from '../../../testHelpers/apolloMocks'
import { RoutesRecord } from '../../../constants'
import { Location, Route, Routes } from 'react-router-dom'
import { EditStateAssign } from './EditStateAssign'

import { Error404 } from '../../Errors/Error404Page'
import { User } from '../../../gen/gqlClient'
import { updateStateAssignmentsMutationMockFailure, updateStateAssignmentsMutationMockSuccess } from '../../../testHelpers/apolloMocks/userGQLMock'
import { Settings } from '../Settings'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
             <Route path={RoutesRecord.MCR_SETTINGS} element={<Settings />}>
            <Route
                path={RoutesRecord.STATE_ASSIGNMENTS}
                element={<div>State AssignmentsTable </div>}
            />
            <Route
                path={RoutesRecord.EDIT_STATE_ASSIGNMENTS}
                element={children}
            />
            <Route path="*" element={<Error404 />} />
            </Route>
        </Routes>
    )
}

describe('EditStateAssign', () => {
    const mockUsers: User[] = [
        mockValidCMSUser({
            id: '1',
            givenName: 'OACT',
            familyName: 'CMSUser',
            divisionAssignment: 'OACT',
        }),
        mockValidCMSApproverUser({
            id: '2',
            givenName: 'DMCP',
            familyName: 'CMSApproverUser',
            divisionAssignment: 'DMCP',
        }),
        mockValidAdminUser({
            id: '3',
            givenName: 'Admin',
            familyName: 'User',
        }),
        mockValidStateUser({
            id: '4',
            givenName: 'State',
            familyName: 'User',
        }),
        mockValidBusinessOwnerUser({
            id: '5',
            givenName: 'BusinessOwner',
            familyName: 'User',
        }),
        mockValidHelpDeskUser({
            id: '6',
            givenName: 'HelpDesk',
            familyName: 'User',
        }),
        mockValidCMSUser({
            id: '7',
            givenName: 'DMCO',
            familyName: 'CMSUser',
            divisionAssignment: 'DMCO',
        }),
        mockValidCMSApproverUser({
            id: '8',
            givenName: 'DMCO',
            familyName: 'CMSApproverUser',
            divisionAssignment: 'DMCO',
        }),
    ]
    afterEach(() => {
        vi.resetAllMocks()
    })

    it('renders without errors for valid state code', async () => {
        renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    indexUsersQueryMock(),
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/WV/edit`,
            },
        })

        await screen.findByRole('form')
        expect(
            screen.getByRole('heading', { name: 'Edit state assignment' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('form', {
                name: 'Edit state assignment',
            })
        ).toBeInTheDocument()
        expect(screen.getAllByText('Update DMCO staff')).not.toBeNull()
        expect(
            screen.getByRole('button', { name: 'Save changes' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Cancel' })
        ).toBeInTheDocument()
    })

    it('renders 404 Not Found for invalid state code', async () => {
        renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    indexUsersQueryMock(),
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/FOO/edit`,
            },
        })

        expect(screen.queryByRole('form')).toBeNull()
        expect(await screen.findByText(/404/)).toBeInTheDocument()
        expect(screen.getByText('404 / Page not found')).toBeInTheDocument()
    })

    it('cancel button moves admin user back to state assignments table', async () => {
        let testLocation: Location // set up location to track URL change
        const { user } = renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    indexUsersQueryMock(),
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/VA/edit`,
            },
            location: (location) => (testLocation = location),
        })
        await screen.findByRole('form')
        await user.click(screen.getByText('Cancel'))
        await waitFor(() => {
            expect(testLocation.pathname).toBe(
                `/mc-review-settings/state-assignments`
            )
        })
    })

    it('expects dropdown to show analyst with CMS or CMSApprover roles assigned to DMCO', async () => {
        const { user } = renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    indexUsersQueryMock(mockUsers),
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/WV/edit`,
            },
        })

        await waitFor(async () => {
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
        })

        expect(screen.getByText('DMCO CMSApproverUser')).toBeInTheDocument()
        expect(screen.getByText('DMCO CMSUser')).toBeInTheDocument()
        expect(screen.queryByText('HelpDesk User')).toBeNull()
        expect(screen.queryByText('BusinessOwner User')).toBeNull()
        expect(screen.queryByText('State User')).toBeNull()
        expect(screen.queryByText('Admin User')).toBeNull()
        expect(screen.queryByText('DMCP CMSApproverUser')).toBeNull()
        expect(screen.queryByText('OACT CMSUser')).toBeNull()
    })

    it('shows errors when required fields are not filled in', async () => {
        const { user } = renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    indexUsersQueryMock(mockUsers),
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/TX/edit`,
            },
        })

        const saveButton = await screen.findByRole('button', {
            name: /Save changes/,
        })
        expect(saveButton).toBeInTheDocument()
        await user.click(saveButton)

        // Wait for expected errors
        await waitFor(() => {
            expect(
                screen.getByText('Edit state assignment')
            ).toBeInTheDocument()
            const alert = screen.getAllByRole('alert')
            expect(alert).toHaveLength(2)
        })

        // Expect error messages
        expect(screen.getByText('Assign a DMCO analyst')).toBeInTheDocument()
        expect(
            screen.getByText('You must select at least one staff member.')
        ).toBeInTheDocument()

        // Select an analyst from the dropdown
        await waitFor(async () => {
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
        })
        const analyst = screen.getByText('DMCO CMSApproverUser')
        expect(analyst).toBeInTheDocument()
        await user.click(analyst)

        // Expect the errors to be gone
        await waitFor(() => {
            const alert = screen.queryAllByRole('alert')
            expect(alert).toHaveLength(0)
        })

        expect(screen.queryByText('Assign a DMCO analyst')).toBeNull()
        expect(
            screen.queryByText('You must select at least one staff member.')
        ).toBeNull()
    })

    it('redirects on successful save', async () => {
        const { user } = renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    indexUsersQueryMock(mockUsers),
                    updateStateAssignmentsMutationMockSuccess('TX', ['7'])
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/TX/edit`,
            },
        })

        const userChooser = await screen.findByRole('combobox')
        await user.click(userChooser)
        const firstUser = await screen.findByText('DMCO CMSUser')
        await user.click(firstUser)

        const saveButton = await screen.findByRole('button', { name: 'Save changes' })
        await user.click(saveButton)

        // check that we successfully call the mutation and redirect back to the dummy state assignments table
        expect(await screen.findByText('State AssignmentsTable')).toBeInTheDocument()

    })

    it('displays an error on a failed save', async () => {
        const { user } = renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    fetchMcReviewSettingsMock(),
                    indexUsersQueryMock(mockUsers),
                    updateStateAssignmentsMutationMockFailure('TX', ['7'])
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/TX/edit`,
            },
        })

        const userChooser = await screen.findByRole('combobox')
        await user.click(userChooser)
        const firstUser = await screen.findByText('DMCO CMSUser')
        await user.click(firstUser)

        const saveButton = await screen.findByRole('button', { name: 'Save changes' })
        await user.click(saveButton)

        expect(await screen.findByRole('heading', { name: 'System error' })).toBeInTheDocument()

    })
})

