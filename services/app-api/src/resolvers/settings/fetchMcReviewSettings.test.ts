import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { type InsertUserArgsType, NewPostgresStore } from '../../postgres'
import {
    testAdminUser,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { v4 as uuidv4 } from 'uuid'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import {
    FetchMcReviewSettingsDocument,
    UpdateStateAssignmentDocument,
} from '../../gen/gqlClient'
import { assertAnError, must } from '../../testHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'

describe('fetchMcReviewSettings', () => {
    it('returns states with assignments', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)

        const adminUser = testAdminUser()
        const server = await constructTestPostgresServer({
            store: postgresStore,
            context: {
                user: adminUser,
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
        const assignedOhioCMSUserResponse = await server.executeOperation({
            query: UpdateStateAssignmentDocument,
            variables: {
                input: {
                    cmsUserID: newCMSUser1.id,
                    stateAssignments: ['OH'],
                },
            },
        }, {
            contextValue: { user: adminUser },
        })
        const assignedOhioCMSUserResult = extractGraphQLResponse(assignedOhioCMSUserResponse)

        if (!assignedOhioCMSUserResult.data?.updateStateAssignment) {
            throw new Error(
                'Unexpected Error: updateStateAssignment resulted no data'
            )
        }
        const assignedOhioCMSUser =
            assignedOhioCMSUserResult.data.updateStateAssignment.user

        const assignedTexasCMSUserResponse = await server.executeOperation({
            query: UpdateStateAssignmentDocument,
            variables: {
                input: {
                    cmsUserID: newCMSUser2.id,
                    stateAssignments: ['TX'],
                },
            },
        }, {
            contextValue: { user: adminUser },
        })
        const assignedTexasCMSUserResult = extractGraphQLResponse(assignedTexasCMSUserResponse)

        if (!assignedTexasCMSUserResult.data?.updateStateAssignment) {
            throw new Error(
                'Unexpected Error: updateStateAssignment resulted no data'
            )
        }
        const assignedTexasCMSUser =
            assignedTexasCMSUserResult.data.updateStateAssignment.user

        const floridaResponse = await server.executeOperation({
            query: UpdateStateAssignmentDocument,
            variables: {
                input: {
                    cmsUserID: newCMSUser3.id,
                    stateAssignments: ['FL'],
                },
            },
        }, {
            contextValue: { user: adminUser },
        })

        const assignedFloridaCMSUserResult = extractGraphQLResponse(floridaResponse)

        if (!assignedFloridaCMSUserResult.data?.updateStateAssignment) {
            throw new Error(
                'Unexpected Error: updateStateAssignment resulted no data'
            )
        }
        const assignedFloridaCMSUser =
            assignedFloridaCMSUserResult.data.updateStateAssignment.user

        const settingsResponse = await server.executeOperation({
            query: FetchMcReviewSettingsDocument,
        }, {
            contextValue: { user: adminUser },
        })

        const mcReviewSettings = extractGraphQLResponse(settingsResponse)

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
        const res = await server.executeOperation({
            query: FetchMcReviewSettingsDocument,
        }, {
            contextValue: { user: testUserAdmin },
        })

        const result = extractGraphQLResponse(res)

        // confirm that we get what we got
        expect(result.errors).toBeUndefined()

        expect(result.data?.fetchMcReviewSettings.emailConfiguration).toBeDefined()
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

        const mcReviewSettings = await server.executeOperation({
            query: FetchMcReviewSettingsDocument,
        }, {
            contextValue: { user: testStateUser() },
        })

        const result = extractGraphQLResponse(mcReviewSettings)

        expect(assertAnError(result).message).toContain(
            'user not authorized to fetch mc review settings'
        )
    })

    it('uses email settings from database with remove-parameter-store flag on', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const adminUser = testAdminUser()

        const server = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            ldService: testLDService(
                {
                    'remove-parameter-store': true
                }
            )
        })

        const emailSettings = must(await postgresStore.findEmailSettings())

        const response = await server.executeOperation({
            query: FetchMcReviewSettingsDocument,
        }, {
            contextValue: { user: adminUser },
        })
        
        const mcReviewSettings = extractGraphQLResponse(response)
        must(mcReviewSettings.data)

        const emailConfig = mcReviewSettings.data.fetchMcReviewSettings.emailConfiguration

        // Expect the default email settings from database
        expect(emailConfig.emailSource).toEqual(emailSettings.emailSource)
        expect(emailConfig.devReviewTeamEmails).toEqual(emailSettings.devReviewTeamEmails)
        expect(emailConfig.oactEmails).toEqual(emailSettings.oactEmails)
        expect(emailConfig.dmcpReviewEmails).toEqual(emailSettings.dmcpReviewEmails)
        expect(emailConfig.dmcpSubmissionEmails).toEqual(emailSettings.dmcpSubmissionEmails)
        expect(emailConfig.dmcoEmails).toEqual(emailSettings.dmcoEmails)
        
        //These emails are arrays in the DB, but single strings in EmailConfiguration type.
        expect(emailConfig.cmsReviewHelpEmailAddress).toEqual(emailSettings.cmsReviewHelpEmailAddress[0])
        expect(emailConfig.cmsRateHelpEmailAddress).toEqual(emailSettings.cmsRateHelpEmailAddress[0])
        expect(emailConfig.helpDeskEmail).toEqual(emailSettings.helpDeskEmail[0])
    })
})
