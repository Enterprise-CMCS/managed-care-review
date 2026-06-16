import type { ApolloServer } from '@apollo/server'
import { v4 as uuidv4 } from 'uuid'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithRate,
} from '../../testHelpers/gqlContractHelpers'
import { overrideTestRateData } from '../../testHelpers/gqlRateHelpers'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { OverrideRateDataDocument } from '../../gen/gqlClient'
import { assertAnErrorCode } from '../../testHelpers'

describe('overrideRateData resolver', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })

    let stateServer: ApolloServer
    let cmsServer: ApolloServer
    let adminServer: ApolloServer

    beforeAll(async () => {
        stateServer = await constructTestPostgresServer({ ldService })
        cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })
        adminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
            },
            ldService,
        })
    })

    it('rejects non-admin users', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        const result = await executeGraphQLOperation(stateServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description: 'Override initiallySubmittedAt',
                    overrides: {
                        initiallySubmittedAt: '2020-01-15T00:00:00.000Z',
                        initiallySubmittedAtOp: 'OVERRIDE',
                    },
                },
            },
        })

        expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })

    it('rejects CMS users', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        const result = await executeGraphQLOperation(cmsServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description: 'Override initiallySubmittedAt',
                    overrides: {
                        initiallySubmittedAt: '2020-01-15T00:00:00.000Z',
                        initiallySubmittedAtOp: 'OVERRIDE',
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
    })

    it('creates a rate override and returns effective rate data', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID
        const overrideDate = '2020-01-15T00:00:00.000Z'

        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description: 'Override initiallySubmittedAt',
                    overrides: {
                        initiallySubmittedAt: overrideDate,
                        initiallySubmittedAtOp: 'OVERRIDE',
                    },
                },
            },
        })

        expect(result.errors).toBeUndefined()
        expect(
            new Date(
                result.data?.overrideRateData.rate.initiallySubmittedAt
            ).toISOString()
        ).toBe(overrideDate)
    })

    it('allows non-delegated admin OAuth clients with admin scope to override rate data', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID
        const oauthAdminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
                oauthClient: {
                    clientId: 'test-admin-oauth-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: ['ADMIN_SUBMISSION_ACTIONS'],
                    isDelegatedUser: false,
                },
            },
            ldService,
        })
        const overrideDate = '2020-01-15T00:00:00.000Z'

        const result = await overrideTestRateData(oauthAdminServer, {
            rateID,
            description: 'Admin OAuth override initiallySubmittedAt',
            overrides: {
                initiallySubmittedAt: overrideDate,
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        expect(new Date(result.initiallySubmittedAt!).toISOString()).toBe(
            overrideDate
        )
    })

    it('rejects delegated admin OAuth clients from overriding rate data', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID
        const oauthAdminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
                oauthClient: {
                    clientId: 'test-delegated-admin-oauth-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: ['ADMIN_SUBMISSION_ACTIONS'],
                    isDelegatedUser: true,
                },
            },
            ldService,
        })

        const result = await executeGraphQLOperation(oauthAdminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description: 'Delegated admin OAuth override attempt',
                    overrides: {
                        initiallySubmittedAt: '2020-01-15T00:00:00.000Z',
                        initiallySubmittedAtOp: 'OVERRIDE',
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
        expect(result.errors?.[0]?.message).toBe(
            'OAuth client does not have write permissions'
        )
    })

    it('rejects CMS-scoped OAuth clients from overriding rate data', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID
        const oauthAdminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
                oauthClient: {
                    clientId: 'test-cms-oauth-client',
                    grants: ['client_credentials'],
                    iss: 'mcreview-test',
                    scopes: ['CMS_SUBMISSION_ACTIONS'],
                    isDelegatedUser: false,
                },
            },
            ldService,
        })

        const result = await executeGraphQLOperation(oauthAdminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description: 'CMS OAuth override attempt',
                    overrides: {
                        initiallySubmittedAt: '2020-01-15T00:00:00.000Z',
                        initiallySubmittedAtOp: 'OVERRIDE',
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
        expect(result.errors?.[0]?.message).toBe(
            'OAuth client does not have write permissions'
        )
    })

    it('returns BAD_USER_INPUT for invalid override input', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateID =
            submittedContract.packageSubmissions[0].rateRevisions[0].rateID

        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID,
                    description: 'Invalid initiallySubmittedAt override',
                    overrides: {
                        initiallySubmittedAtOp: 'OVERRIDE',
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
    })

    it('returns BAD_USER_INPUT when the rate is not in an overridable status', async () => {
        const draftContract =
            await createAndUpdateTestContractWithRate(stateServer)
        const draftRateID = draftContract.draftRates?.[0]?.id

        if (!draftRateID) {
            throw new Error('Expected test contract to include a draft rate')
        }

        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID: draftRateID,
                    description: 'Override draft rate',
                    overrides: {
                        initiallySubmittedAt: '2020-01-15T00:00:00.000Z',
                        initiallySubmittedAtOp: 'OVERRIDE',
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(result.errors?.[0]?.message).toContain(
            'rate consolidated status must be SUBMITTED or RESUBMITTED'
        )
    })

    it('returns NOT_FOUND when the rate does not exist', async () => {
        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID: uuidv4(),
                    description: 'Missing rate',
                    overrides: {
                        initiallySubmittedAt: '2020-01-15T00:00:00.000Z',
                        initiallySubmittedAtOp: 'OVERRIDE',
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('NOT_FOUND')
    })

    it('accepts empty document override arrays without changing effective documents', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateRevision =
            submittedContract.packageSubmissions[0].rateRevisions[0]

        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideRateDataDocument,
            variables: {
                input: {
                    rateID: rateRevision.rateID,
                    description: 'Empty document override arrays',
                    overrides: {
                        revisionOverride: {
                            rateDocuments: [],
                            supportingDocuments: [],
                        },
                    },
                },
            },
        })

        expect(result.errors).toBeUndefined()
        expect(
            result.data?.overrideRateData.rate.packageSubmissions[0]
                .rateRevision.formData.rateDocuments
        ).toHaveLength(rateRevision.formData.rateDocuments.length)
    })
})
