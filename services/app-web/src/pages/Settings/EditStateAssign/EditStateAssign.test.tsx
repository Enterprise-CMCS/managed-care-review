import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../testHelpers'
import { fetchCurrentUserMock, mockValidAdminUser } from '@mc-review/mocks'
import { RoutesRecord } from '@mc-review/constants'
import { Location, Route, Routes } from 'react-router-dom'
import { EditStateAssign } from './EditStateAssign'
import userEvent from '@testing-library/user-event'

import { Error404 } from '../../Errors/Error404Page'

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
                ],
            },
            routerProvider: {
                route: `/mc-review-settings/state-assignments/FOO/edit`,
            },
        })

        expect(screen.queryByRole('form')).toBeNull()
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

    it.todo('shows errors when required fields are not filled in')
})
