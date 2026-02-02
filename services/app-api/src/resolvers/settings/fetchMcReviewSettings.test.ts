import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { type InsertUserArgsType, NewPostgresStore } from '../../postgres'
import {
    testAdminUser,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { v4 as uuidv4 } from 'uuid'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    FetchMcReviewSettingsDocument,
    UpdateStateAssignmentDocument,
} from '../../gen/gqlClient'
import { assertAnError, must } from '../../testHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'

describe('fetchMcReviewSettings', () => {
    it('returns states with assignments', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser(),
            },
        })

        const mockTestCMSUser = (): InsertUserArgsType => ({
            userID: uuidv4(),
            ...testCMSUser({
                id: uuidv4(),
                divisionAssignment: 'DMCO',
            }),
        })

        // Setup CMS users
        const newCMSUser1 = must(
            await postgresStore.insertUser(mockTestCMSUser())
        )
        const newCMSUser2 = must(
            await await postgresStore.insertUser(mockTestCMSUser())
        )
        const newCMSUser3 = must(
            await await postgresStore.insertUser(mockTestCMSUser())
        )

        // Assign states to each CMS user
        const assignedOhioCMSUserResult = await executeGraphQLOperation(
            server,
            {
                query: UpdateStateAssignmentDocument,
                variables: {
                    input: {
                        cmsUserID: newCMSUser1.id,
                        stateAssignments: ['OH'],
                    },
                },
            }
        )

        if (!assignedOhioCMSUserResult.data?.updateStateAssignment) {
            throw new Error(
                'Unexpected Error: updateStateAssignment resulted no data'
            )
        }
        const assignedOhioCMSUser =
            assignedOhioCMSUserResult.data.updateStateAssignment.user

        const assignedTexasCMSUserResult = await executeGraphQLOperation(
            server,
            {
                query: UpdateStateAssignmentDocument,
                variables: {
                    input: {
                        cmsUserID: newCMSUser2.id,
                        stateAssignments: ['TX'],
                    },
                },
            }
        )

        if (!assignedTexasCMSUserResult.data?.updateStateAssignment) {
            throw new Error(
                'Unexpected Error: updateStateAssignment resulted no data'
            )
        }
        const assignedTexasCMSUser =
            assignedTexasCMSUserResult.data.updateStateAssignment.user

        const assignedFloridaCMSUserResult = await executeGraphQLOperation(
            server,
            {
                query: UpdateStateAssignmentDocument,
                variables: {
                    input: {
                        cmsUserID: newCMSUser3.id,
                        stateAssignments: ['FL'],
                    },
                },
            }
        )

        if (!assignedFloridaCMSUserResult.data?.updateStateAssignment) {
            throw new Error(
                'Unexpected Error: updateStateAssignment resulted no data'
            )
        }
        const assignedFloridaCMSUser =
            assignedFloridaCMSUserResult.data.updateStateAssignment.user

        const mcReviewSettings = await executeGraphQLOperation(server, {
            query: FetchMcReviewSettingsDocument,
        })

        if (!mcReviewSettings.data?.fetchMcReviewSettings?.stateAssignments) {
            throw new Error(
                'Unexpected Error: fetchMcReviewSettings resulted no data'
            )
        }

        const stateAssignments =
            mcReviewSettings.data.fetchMcReviewSettings.stateAssignments

        expect(stateAssignments).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    stateCode: 'OH',
                    name: 'Ohio',
                    assignedCMSUsers: expect.arrayContaining([
                        expect.objectContaining({
                            id: assignedOhioCMSUser.id,
                            role: assignedOhioCMSUser.role,
                            givenName: assignedOhioCMSUser.givenName,
                            familyName: assignedOhioCMSUser.familyName,
                            email: assignedOhioCMSUser.email,
                            divisionAssignment:
                                assignedOhioCMSUser.divisionAssignment,
                        }),
                    ]),
                }),
                expect.objectContaining({
                    stateCode: 'TX',
                    name: 'Texas',
                    assignedCMSUsers: expect.arrayContaining([
                        expect.objectContaining({
                            id: assignedTexasCMSUser.id,
                            role: assignedTexasCMSUser.role,
                            givenName: assignedTexasCMSUser.givenName,
                            familyName: assignedTexasCMSUser.familyName,
                            email: assignedTexasCMSUser.email,
                            divisionAssignment:
                                assignedTexasCMSUser.divisionAssignment,
                        }),
                    ]),
                }),
                expect.objectContaining({
                    stateCode: 'FL',
                    name: 'Florida',
                    assignedCMSUsers: expect.arrayContaining([
                        expect.objectContaining({
                            id: assignedFloridaCMSUser.id,
                            role: assignedFloridaCMSUser.role,
                            givenName: assignedFloridaCMSUser.givenName,
                            familyName: assignedFloridaCMSUser.familyName,
                            email: assignedFloridaCMSUser.email,
                            divisionAssignment:
                                assignedFloridaCMSUser.divisionAssignment,
                        }),
                    ]),
                }),
            ])
        )
    })

    it('returns email configuration', async () => {
        const testUserAdmin = testAdminUser()

        const server = await constructTestPostgresServer({
            context: {
                user: testUserAdmin,
            },
        })

        // make a mock request
        const res = await executeGraphQLOperation(server, {
            query: FetchMcReviewSettingsDocument,
        })

        // confirm that we get what we got
        expect(res.errors).toBeUndefined()

        expect(res.data?.fetchMcReviewSettings.emailConfiguration).toBeDefined()
    })

    it('errors when called by state user', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testStateUser(),
            },
        })

        const mcReviewSettings = await executeGraphQLOperation(server, {
            query: FetchMcReviewSettingsDocument,
        })

        expect(assertAnError(mcReviewSettings).message).toContain(
            'user not authorized to fetch mc review settings'
        )
    })

    it('uses email settings from database with remove-parameter-store flag on', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const server = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
            },
            ldService: testLDService({
                'remove-parameter-store': true,
            }),
        })

        const emailSettings = must(await postgresStore.findEmailSettings())

        const mcReviewSettings = must(
            await executeGraphQLOperation(server, {
                query: FetchMcReviewSettingsDocument,
            })
        )

        const emailConfig =
            mcReviewSettings.data?.fetchMcReviewSettings.emailConfiguration

        // Expect the default email settings from database
        expect(emailConfig.emailSource).toEqual(emailSettings.emailSource)
        expect(emailConfig.devReviewTeamEmails).toEqual(
            emailSettings.devReviewTeamEmails
        )
        expect(emailConfig.oactEmails).toEqual(emailSettings.oactEmails)
        expect(emailConfig.dmcpReviewEmails).toEqual(
            emailSettings.dmcpReviewEmails
        )
        expect(emailConfig.dmcpSubmissionEmails).toEqual(
            emailSettings.dmcpSubmissionEmails
        )
        expect(emailConfig.dmcoEmails).toEqual(emailSettings.dmcoEmails)

        //These emails are arrays in the DB, but single strings in EmailConfiguration type.
        expect(emailConfig.cmsReviewHelpEmailAddress).toEqual(
            emailSettings.cmsReviewHelpEmailAddress[0]
        )
        expect(emailConfig.cmsRateHelpEmailAddress).toEqual(
            emailSettings.cmsRateHelpEmailAddress[0]
        )
        expect(emailConfig.helpDeskEmail).toEqual(
            emailSettings.helpDeskEmail[0]
        )
    })

    it('errors when called by a state user and an oauth client', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testStateUser(),
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
        })

        const mcReviewSettings = await executeGraphQLOperation(server, {
            query: FetchMcReviewSettingsDocument,
        })

        expect(assertAnError(mcReviewSettings).message).toContain(
            'oauth clients cannot access this functionality'
        )
    })

    it('errors when called by an admin user and an oauth client', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: testAdminUser(),
                oauthClient: {
                    clientId: 'test-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
        })

        const mcReviewSettings = await executeGraphQLOperation(server, {
            query: FetchMcReviewSettingsDocument,
        })

        expect(assertAnError(mcReviewSettings).message).toContain(
            'oauth clients cannot access this functionality'
        )
    })
})
