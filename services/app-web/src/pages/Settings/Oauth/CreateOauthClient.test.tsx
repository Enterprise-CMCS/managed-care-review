import { Route, Routes } from 'react-router'
import { RoutesRecord } from '@mc-review/constants'
import { Settings } from '../Settings'
import { Error404 } from '../../Errors/Error404Page'
import { User } from '../../../gen/gqlClient'
import {
    createOauthClientMockFailure,
    createOauthClientMockSuccess,
    fetchCurrentUserMock,
    fetchMcReviewSettingsMock,
    indexUsersQueryMock,
    mockValidAdminUser,
    mockValidBusinessOwnerUser,
    mockValidCMSApproverUser,
    mockValidCMSUser,
    mockValidHelpDeskUser,
    mockValidStateUser,
} from '@mc-review/mocks'
import { renderWithProviders } from '../../../testHelpers'
import { CreateOauthClient } from './CreateOauthClient'
import { screen, waitFor } from '@testing-library/react'

const wrapInRoutes = (children: React.ReactNode) => {
    return (
        <Routes>
            <Route path={RoutesRecord.MCR_SETTINGS} element={<Settings />}>
                <Route
                    path={RoutesRecord.STATE_ASSIGNMENTS} //TODO: Replace this with OAuth client page
                    element={<div>State Assignments Table</div>}
                />
                <Route
                    path={RoutesRecord.CREATE_OAUTH_CLIENT}
                    element={children}
                />
                <Route path="*" element={<Error404 />} />
            </Route>
        </Routes>
    )
}

const mockUsers: User[] = [
    mockValidCMSUser({
        id: '1',
        givenName: 'Jim',
        email: 'cmsUser1@example.com',
        familyName: 'Bob',
        divisionAssignment: 'OACT',
    }),
    mockValidCMSApproverUser({
        id: '2',
        givenName: 'DMCP',
        email: 'cmsUser2@example.com',
        familyName: 'CMSApproverUser',
        divisionAssignment: 'DMCP',
    }),
    mockValidAdminUser({
        id: '3',
        givenName: 'Admin',
        email: 'cmsAdmin1@example.com',
        familyName: 'User',
    }),
    mockValidStateUser({
        id: '4',
        email: 'stateUser1@example.com',
        givenName: 'State',
        familyName: 'User',
    }),
    mockValidBusinessOwnerUser({
        id: '5',
        email: 'boUser1@example.com',
        givenName: 'BusinessOwner',
        familyName: 'User',
    }),
    mockValidHelpDeskUser({
        id: '6',
        email: 'hdUser1@example.com',
        givenName: 'HelpDesk',
        familyName: 'User',
    }),
    mockValidCMSUser({
        id: '7',
        givenName: 'DMCO',
        email: 'cmsUser3@example.com',
        familyName: 'CMSUser',
        divisionAssignment: 'DMCO',
    }),
    mockValidCMSApproverUser({
        id: '8',
        email: 'cmsUser4@example.com',
        givenName: 'DMCO',
        familyName: 'CMSApproverUser',
        divisionAssignment: 'DMCO',
    }),
]

describe('CreateOauthClient', () => {
    afterEach(() => {
        vi.resetAllMocks()
    })

    it('renders without errors', async () => {
        const { user } = renderWithProviders(
            wrapInRoutes(<CreateOauthClient />),
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        indexUsersQueryMock(mockUsers),
                        fetchMcReviewSettingsMock(),
                    ],
                },
                routerProvider: {
                    route: `/mc-review-settings/oauth-client/create-oauth-client`,
                },
            }
        )

        await waitFor(async () => {
            expect(
                screen.getByTestId('createOAuthClientForm')
            ).toBeInTheDocument()
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
        })

        expect(screen.getByText('cmsUser1@example.com')).toBeInTheDocument()
        expect(screen.getByText('cmsUser2@example.com')).toBeInTheDocument()
        expect(screen.queryByText('HelpDesk User')).toBeNull()
        expect(screen.queryByText('BusinessOwner User')).toBeNull()
        expect(screen.queryByText('State User')).toBeNull()
        expect(screen.queryByText('Admin User')).toBeNull()
        expect(screen.queryByText('cmsUser3@example.com')).toBeInTheDocument()
        expect(screen.queryByText('cmsUser4@example.com')).toBeInTheDocument()
    })

    it('creates OAuth client and redirects user', async () => {
        const selectedUser = mockValidCMSUser({
            id: 'jim-bob-1',
            givenName: 'Jim',
            email: 'jim.bob@example.com',
            familyName: 'Bob',
            divisionAssignment: 'OACT',
        })
        const description = 'new OAuth client'
        const { user } = renderWithProviders(
            wrapInRoutes(<CreateOauthClient />),
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        indexUsersQueryMock([selectedUser, ...mockUsers]),
                        createOauthClientMockSuccess({
                            input: {
                                userID: selectedUser.id,
                                description: description,
                            },
                            user: {
                                ...selectedUser,
                            },
                        }),
                    ],
                },
                routerProvider: {
                    route: `/mc-review-settings/oauth-client/create-oauth-client`,
                },
            }
        )

        await waitFor(async () => {
            expect(
                screen.getByTestId('createOAuthClientForm')
            ).toBeInTheDocument()
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
        })

        const cmsUser = screen.getByText(selectedUser.email)

        expect(cmsUser).toBeInTheDocument()
        await user.click(cmsUser)

        const descriptionInput = screen.getByRole('textbox', {
            name: /Description for OAuth client/,
        })
        expect(descriptionInput).toBeInTheDocument()

        await user.type(descriptionInput, description)

        const createButton = screen.getByRole('button', {
            name: /Create client/,
        })
        await user.click(createButton)

        await waitFor(async () => {
            //TODO: Replace this with the OAuth client page
            expect(
                screen.getByText('State Assignments Table')
            ).toBeInTheDocument()
            //TODO: Look for a banner
            //TODO: Look for new client on the table
        })
    })
})

describe('CreateOauthClient error handling', () => {
    it('shows errors when required fields are not filled in', async () => {
        const { user } = renderWithProviders(
            wrapInRoutes(<CreateOauthClient />),
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        indexUsersQueryMock(mockUsers),
                    ],
                },
                routerProvider: {
                    route: `/mc-review-settings/oauth-client/create-oauth-client`,
                },
            }
        )

        await waitFor(async () => {
            expect(
                screen.getByTestId('createOAuthClientForm')
            ).toBeInTheDocument()
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
        })

        const descriptionInput = screen.getByRole('textbox', {
            name: /Description for OAuth client/,
        })
        expect(descriptionInput).toBeInTheDocument()

        await user.type(descriptionInput, 'test')

        const createButton = screen.getByRole('button', {
            name: /Create client/,
        })
        await user.click(createButton)

        expect(
            screen.getByText(
                'You must select a user to be associated with this OAuth client.'
            )
        ).toBeInTheDocument()
    })
    it('displays error banner on failed OAuth client creation', async () => {
        const selectedUser = mockValidCMSUser({
            id: 'jim-bob-1',
            givenName: 'Jim',
            email: 'jim.bob@example.com',
            familyName: 'Bob',
            divisionAssignment: 'OACT',
        })
        const description = 'new OAuth client'
        const { user } = renderWithProviders(
            wrapInRoutes(<CreateOauthClient />),
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({
                            user: mockValidAdminUser(),
                            statusCode: 200,
                        }),
                        indexUsersQueryMock([selectedUser, ...mockUsers]),
                        createOauthClientMockFailure(),
                    ],
                },
                routerProvider: {
                    route: `/mc-review-settings/oauth-client/create-oauth-client`,
                },
            }
        )

        await waitFor(async () => {
            expect(
                screen.getByTestId('createOAuthClientForm')
            ).toBeInTheDocument()
            const dropdown = screen.getByRole('combobox')
            expect(dropdown).toBeInTheDocument()
            await user.click(dropdown)
        })

        const cmsUser = screen.getByText(selectedUser.email)

        expect(cmsUser).toBeInTheDocument()
        await user.click(cmsUser)

        const descriptionInput = screen.getByRole('textbox', {
            name: /Description for OAuth client/,
        })
        expect(descriptionInput).toBeInTheDocument()

        await user.type(descriptionInput, description)

        const createButton = screen.getByRole('button', {
            name: /Create client/,
        })
        await user.click(createButton)

        expect(
            await screen.findByRole('heading', { name: /System error/ })
        ).toBeInTheDocument()
    })
})
