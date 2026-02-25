import {
    testAdminUser,
    testCMSUser,
    testHelpdeskUser,
    testBusinessOwnerUser,
} from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { fetchTestRateById } from '../../testHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { overrideTestRateDataMock } from '../../testHelpers/gqlRateHelpers'
import { OverrideRateDataDocument } from '../../gen/gqlClient'
import type { ApolloServer } from '@apollo/server'

describe('overrideRateData', () => {
    const adminUser = testAdminUser()

    it('returns the initiallySubmittedAt override on a fetchedRate', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: testCMSUser() },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        // Create and submit a contract with rate
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        // Assert original initiallySubmittedAt exists after submission
        const initialRate = await fetchTestRateById(cmsServer, rateID)
        expect(initialRate.initiallySubmittedAt).toBeDefined()
        const originalInitiallySubmittedAt = initialRate.initiallySubmittedAt

        // Override initiallySubmittedAt
        const overrideDate = new Date('2020-01-01')
        const afterOverride = await overrideTestRateDataMock(
            adminServer,
            rateID,
            'Override initiallySubmittedAt for testing',
            { initiallySubmittedAt: overrideDate }
        )

        // Assert override was recorded correctly
        expect(afterOverride.rateOverrides).toHaveLength(1)
        expect(afterOverride.rateOverrides?.[0]).toEqual(
            expect.objectContaining({
                description: 'Override initiallySubmittedAt for testing',
                overrides: expect.objectContaining({
                    initiallySubmittedAt: overrideDate,
                }),
                updatedBy: expect.objectContaining({
                    ...adminUser,
                }),
            })
        )

        // Assert fetched rate reflects the overridden value
        const overriddenRate = await fetchTestRateById(cmsServer, rateID)
        expect(overriddenRate.initiallySubmittedAt).toStrictEqual(overrideDate)

        // Clear the override by passing null
        const afterClear = await overrideTestRateDataMock(
            adminServer,
            rateID,
            'Remove initiallySubmittedAt override',
            {
                initiallySubmittedAt: null,
            }
        )

        // Assert both overrides are recorded (most recent first)
        expect(afterClear.rateOverrides).toHaveLength(2)
        expect(afterClear.rateOverrides?.[0]).toEqual(
            expect.objectContaining({
                description: 'Remove initiallySubmittedAt override',
                overrides: { initiallySubmittedAt: null },
                updatedBy: expect.objectContaining({
                    ...adminUser,
                }),
            })
        )
        expect(afterClear.rateOverrides?.[1]).toEqual(
            expect.objectContaining({
                description: 'Override initiallySubmittedAt for testing',
                overrides: { initiallySubmittedAt: overrideDate },
                updatedBy: expect.objectContaining({
                    ...adminUser,
                }),
            })
        )

        // Assert fetched rate reverts to the original initiallySubmittedAt
        const restoredRate = await fetchTestRateById(cmsServer, rateID)
        expect(restoredRate.initiallySubmittedAt).toStrictEqual(
            originalInitiallySubmittedAt
        )
    })

    it('errors when overriding initiallySubmittedAt to a future date', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: testCMSUser() },
        })
        const adminServer = await constructTestPostgresServer({
            context: { user: adminUser },
        })

        // Create and submit a contract with rate
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        // Assert original initiallySubmittedAt exists after submission
        const initialRate = await fetchTestRateById(cmsServer, rateID)
        expect(initialRate.initiallySubmittedAt).toBeDefined()

        // Attempt to override initiallySubmittedAt to a future date
        const futureDate = '2050-12-31T00:00:00.000Z'
        const errorResult = await executeGraphQLOperation(adminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description: 'Override initiallySubmittedAt to future date',
                    data: { initiallySubmittedAt: futureDate },
                },
            },
        })

        // Assert the mutation returned an error
        expect(errorResult.errors).toBeDefined()
        expect(errorResult.errors).toHaveLength(1)
        expect(errorResult.errors?.[0].message).toContain(
            'initiallySubmittedAt cannot be in the future.'
        )

        // Assert fetched rate still has the original initiallySubmittedAt
        const unchangedRate = await fetchTestRateById(cmsServer, rateID)
        expect(unchangedRate.initiallySubmittedAt).toStrictEqual(
            initialRate.initiallySubmittedAt
        )

        // Assert todays date is a valid override
        const todaysDate = new Date()
        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description:
                        "Override initiallySubmittedAt to today's date",
                    data: { initiallySubmittedAt: todaysDate },
                },
            },
        })

        expect(result.errors).toBeUndefined()

        const changedRate = await fetchTestRateById(cmsServer, rateID)
        expect(changedRate.initiallySubmittedAt).toStrictEqual(todaysDate)
    })

    it('denies non-admin users from overriding rate data', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: { user: testCMSUser() },
        })
        const helpDeskServer = await constructTestPostgresServer({
            context: { user: testHelpdeskUser() },
        })
        const businessUserServer = await constructTestPostgresServer({
            context: { user: testBusinessOwnerUser() },
        })

        const errorOverrideRequest = async (server: ApolloServer) =>
            await executeGraphQLOperation(server, {
                query: OverrideRateDataDocument,
                variables: {
                    input: {
                        rateID,
                        description: 'Should be denied',
                        data: {
                            initiallySubmittedAt: '2020-01-01T00:00:00.000Z',
                        },
                    },
                },
            })

        // Create and submit a contract with rate
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        //Assert non-admin users are denied access
        const stateUSerResult = await errorOverrideRequest(stateServer)
        expect(stateUSerResult.errors?.[0].message).toBe(
            'user not authorized to override rate data'
        )

        const cmsUserResult = await errorOverrideRequest(cmsServer)
        expect(cmsUserResult.errors?.[0].message).toBe(
            'user not authorized to override rate data'
        )

        const helpDeskUserResult = await errorOverrideRequest(helpDeskServer)
        expect(helpDeskUserResult.errors?.[0].message).toBe(
            'user not authorized to override rate data'
        )

        const businessUserResult =
            await errorOverrideRequest(businessUserServer)
        expect(businessUserResult.errors?.[0].message).toBe(
            'user not authorized to override rate data'
        )
    })

    it('denies OAuth client requests', async () => {
        const stateServer = await constructTestPostgresServer()

        // Create and submit a contract with rate
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        // Create server with OAuth client context
        const oauthServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
                oauthClient: {
                    clientId: 'test-oauth-client',
                    grants: ['client_credentials'],
                    isOAuthClient: true,
                    scopes: [],
                    isDelegatedUser: false,
                },
            },
        })

        const result = await executeGraphQLOperation(oauthServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description: 'Should be denied',
                    data: { initiallySubmittedAt: '2020-01-01T00:00:00.000Z' },
                },
            },
        })

        expect(result.errors).toBeDefined()
        expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN')
        expect(result.errors?.[0].message).toBe(
            'OAuth client does not have write permissions'
        )
    })
})
