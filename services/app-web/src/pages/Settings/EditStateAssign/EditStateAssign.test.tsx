import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import {
    fetchCurrentUserMock,
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
import userEvent from '@testing-library/user-event'

import { Error404 } from '../../Errors/Error404Page'
import { User } from '../../../gen/gqlClient'

// Wrap test component in some top level routes to allow getParams to be tested
const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route
                path={RoutesRecord.SETTINGS}
                element={<div>State AssignmentsTable </div>}
            />
            <Route
                path={RoutesRecord.EDIT_STATE_ASSIGNMENTS}
                element={children}
            />
            <Route path="*" element={<Error404 />} />
        </Routes>
    )
}

describe('EditStateAssign', () => {
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
        renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    indexUsersQueryMock(),
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/VA/edit`,
            },
            location: (location) => (testLocation = location),
        })
        await screen.findByRole('form')
        await userEvent.click(screen.getByText('Cancel'))
        await waitFor(() => {
            expect(testLocation.pathname).toBe(
                `/mc-review-settings/state-assignments`
            )
        })
    })

    it('expects dropdown to show analyst with CMS or CMSApprover roles assigned to DMCO', async () => {
        const testUsers: User[] = [
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

        renderWithProviders(wrapInRoutes(<EditStateAssign />), {
            apolloProvider: {
                mocks: [
                    fetchCurrentUserMock({
                        user: mockValidAdminUser(),
                        statusCode: 200,
                    }),
                    indexUsersQueryMock(testUsers),
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/WV/edit`,
            },
        })

        await waitFor(async () => {
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await userEvent.click(dropdown)
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

    it.todo('shows errors when required fields are not filled in')
})
