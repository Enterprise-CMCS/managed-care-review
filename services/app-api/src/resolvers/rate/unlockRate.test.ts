import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { UnlockRateDocument } from '../../gen/gqlClient'
import {
    iterableCmsUsersMockData,
    testCMSUser,
} from '../../testHelpers/userHelpers'
import { expectToBeDefined } from '../../testHelpers/assertionHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { createSubmitAndUnlockTestRate } from '../../testHelpers/gqlRateHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-api/src/testHelpers/s3Helpers'
import { withdrawTestRate } from '../../testHelpers/gqlRateHelpers'
import { extractGraphQLResponse } from '../../testHelpers/apolloV4ResponseHelper'

describe(`unlockRate`, () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    describe.each(iterableCmsUsersMockData)(
        '$userRole tests',
        ({ mockUser }) => {
            it('changes rate status to UNLOCKED and creates a new draft revision with unlock info', async () => {
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsUser = mockUser()
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })

                // Create and unlock a rate
                const updatedRate = await createSubmitAndUnlockTestRate(
                    stateServer,
                    cmsServer,
                    cmsUser
                )

                expect(updatedRate.status).toBe('UNLOCKED')

                if (!updatedRate.draftRevision) {
                    throw new Error('no draftrate')
                }

                if (!updatedRate.draftRevision.unlockInfo) {
                    throw new Error('no unlockinfo')
                }

                expect(updatedRate.draftRevision.unlockInfo.updatedReason).toBe(
                    'test unlock'
                )
            })

            it('returns status error if rate is actively being edited in draft', async () => {
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsUser = mockUser()
                const cmsServer = await constructTestPostgresServer({
                    context: {
                        user: cmsUser,
                    },
                    ldService,
                    s3Client: mockS3,
                })

                // Create a rate
                const rate = await createSubmitAndUnlockTestRate(
                    stateServer,
                    cmsServer,
                    cmsUser
                )

                // Try to unlock the rate again
                const response2 = await cmsServer.executeOperation({
                    query: UnlockRateDocument,
                    variables: {
                        input: {
                            rateID: rate.id,
                            unlockedReason: 'Super duper good reason.',
                        },
                    },
                }, {
                    contextValue: { user: mockUser() },
                })

                const unlockResult2 = extractGraphQLResponse(response2)

                expectToBeDefined(unlockResult2.errors)
                expect(unlockResult2.errors[0].message).toBe(
                    'Attempted to unlock rate with wrong status: UNLOCKED'
                )
            })

            it('returns unauthorized error for state user', async () => {
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })

                const contract =
                    await createAndSubmitTestContractWithRate(stateServer)
                // Create a rate
                const rate = contract.packageSubmissions[0].rateRevisions[0]

                // Unlock the rate
                const response = await stateServer.executeOperation({
                    query: UnlockRateDocument,
                    variables: {
                        input: {
                            rateID: rate.id,
                            unlockedReason: 'Super duper good reason.',
                        },
                    },
                })

                const unlockResult = extractGraphQLResponse(response)

                expectToBeDefined(unlockResult.errors)
                expect(unlockResult.errors[0].message).toBe(
                    'user not authorized to unlock rate'
                )
            })
        }
    )

    it('does not allow rates with wrong status to be unlocked', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsUser = testCMSUser()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
            s3Client: mockS3,
        })

        // Create and unlock a rate
        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID

        await withdrawTestRate(cmsServer, rateID, 'withdrawRate')

        const unlockResult = await cmsServer.executeOperation({
            query: UnlockRateDocument,
            variables: {
                input: {
                    rateID,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        // expect error to be defined
        expectToBeDefined(unlockResult.errors)

        // expect error to be invalid status
        expect(unlockResult.errors[0].message).toBe(
            'Attempted to unlock rate with wrong status: WITHDRAWN'
        )
    })
})
