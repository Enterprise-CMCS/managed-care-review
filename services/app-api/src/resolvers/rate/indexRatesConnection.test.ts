import { IndexRatesConnectionDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import type { RateConnectionEdge } from '../../gen/gqlServer'
import {
    iterableCmsUsersMockData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'
import { assertAnErrorCode } from '../../testHelpers/gqlAssertions'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('indexRatesConnection', () => {
    describe.each(iterableCmsUsersMockData)(
        '$userRole tests',
        ({ mockUser }) => {
            const ldService = testLDService({
                'rate-edit-unlock': true,
            })
            const mockS3 = testS3Client()

            it('returns paginated rates with cursors and pageInfo', async () => {
                const cmsUser = mockUser()
                const stateServer = await constructTestPostgresServer({
                    ldService,
                    s3Client: mockS3,
                })
                const cmsServer = await constructTestPostgresServer({
                    context: { user: cmsUser },
                    ldService,
                    s3Client: mockS3,
                })

                const contract1 =
                    await createAndSubmitTestContractWithRate(stateServer)
                const contract2 =
                    await createAndSubmitTestContractWithRate(stateServer)
                const contract3 =
                    await createAndSubmitTestContractWithRate(stateServer)

                const rateIDs = [
                    contract1.packageSubmissions[0].rateRevisions[0].rateID,
                    contract2.packageSubmissions[0].rateRevisions[0].rateID,
                    contract3.packageSubmissions[0].rateRevisions[0].rateID,
                ]

                const firstPage = await executeGraphQLOperation(cmsServer, {
                    query: IndexRatesConnectionDocument,
                    variables: {
                        input: {
                            rateIDs,
                            first: 2,
                        },
                    },
                })

                expect(firstPage.errors).toBeUndefined()
                expect(firstPage.data?.indexRatesConnection.totalCount).toBe(3)
                expect(firstPage.data?.indexRatesConnection.totalPages).toBe(2)
                expect(firstPage.data?.indexRatesConnection.edges).toHaveLength(
                    2
                )
                expect(
                    firstPage.data?.indexRatesConnection.pageInfo.hasNextPage
                ).toBe(true)
                expect(
                    firstPage.data?.indexRatesConnection.pageInfo.endCursor
                ).toBe(firstPage.data?.indexRatesConnection.edges[1].cursor)

                const firstPageIDs =
                    firstPage.data?.indexRatesConnection.edges.map(
                        (edge: RateConnectionEdge) => edge.node.id
                    )

                const secondPage = await executeGraphQLOperation(cmsServer, {
                    query: IndexRatesConnectionDocument,
                    variables: {
                        input: {
                            rateIDs,
                            first: 2,
                            after: firstPage.data?.indexRatesConnection.pageInfo
                                .endCursor,
                        },
                    },
                })

                expect(secondPage.errors).toBeUndefined()
                expect(secondPage.data?.indexRatesConnection.totalCount).toBe(3)
                expect(secondPage.data?.indexRatesConnection.totalPages).toBe(2)
                expect(
                    secondPage.data?.indexRatesConnection.edges
                ).toHaveLength(1)
                expect(
                    secondPage.data?.indexRatesConnection.pageInfo.hasNextPage
                ).toBe(false)
                expect(
                    secondPage.data?.indexRatesConnection.pageInfo.endCursor
                ).toBe(secondPage.data?.indexRatesConnection.edges[0].cursor)

                const secondPageIDs =
                    secondPage.data?.indexRatesConnection.edges.map(
                        (edge: RateConnectionEdge) => edge.node.id
                    )

                expect(firstPageIDs).toBeDefined()
                expect(secondPageIDs).toBeDefined()
                expect(
                    [...(firstPageIDs ?? []), ...(secondPageIDs ?? [])].sort()
                ).toEqual([...rateIDs].sort())
            })

            it('returns BAD_USER_INPUT when first exceeds the page size limit', async () => {
                const cmsUser = mockUser()
                const cmsServer = await constructTestPostgresServer({
                    context: { user: cmsUser },
                    ldService,
                    s3Client: mockS3,
                })

                const result = await executeGraphQLOperation(cmsServer, {
                    query: IndexRatesConnectionDocument,
                    variables: {
                        input: {
                            first: 151,
                        },
                    },
                })

                expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
                expect(result.errors?.[0].message).toContain(
                    'first must be between 1 and 150'
                )
            })

            it('returns BAD_USER_INPUT when after is malformed', async () => {
                const cmsUser = mockUser()
                const cmsServer = await constructTestPostgresServer({
                    context: { user: cmsUser },
                    ldService,
                    s3Client: mockS3,
                })

                const result = await executeGraphQLOperation(cmsServer, {
                    query: IndexRatesConnectionDocument,
                    variables: {
                        input: {
                            after: 'not-a-cursor',
                        },
                    },
                })

                expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
                expect(result.errors?.[0].message).toContain(
                    'after must be a valid rate pagination cursor'
                )
            })
        }
    )

    it('paginates by lastUpdatedForDisplay after fetching rates', async () => {
        const ldService = testLDService({
            'rate-edit-unlock': true,
        })
        const mockS3 = testS3Client()
        const prismaClient = await sharedTestPrismaClient()

        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
        })

        const displayLatestContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const displayOlderContract =
            await createAndSubmitTestContractWithRate(stateServer)

        const displayLatestRateID =
            displayLatestContract.packageSubmissions[0].rateRevisions[0].rateID
        const displayOlderRateID =
            displayOlderContract.packageSubmissions[0].rateRevisions[0].rateID

        await prismaClient.$transaction([
            prismaClient.updateInfoTable.updateMany({
                where: {
                    submittedRates: {
                        some: {
                            rateID: displayLatestRateID,
                        },
                    },
                },
                data: {
                    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
                },
            }),
            prismaClient.updateInfoTable.updateMany({
                where: {
                    submittedRates: {
                        some: {
                            rateID: displayOlderRateID,
                        },
                    },
                },
                data: {
                    updatedAt: new Date('2025-01-01T00:00:00.000Z'),
                },
            }),
            prismaClient.rateTable.update({
                where: {
                    id: displayLatestRateID,
                },
                data: {
                    updatedAt: new Date('2020-01-01T00:00:00.000Z'),
                },
            }),
            prismaClient.rateTable.update({
                where: {
                    id: displayOlderRateID,
                },
                data: {
                    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
                },
            }),
        ])

        const firstPage = await executeGraphQLOperation(cmsServer, {
            query: IndexRatesConnectionDocument,
            variables: {
                input: {
                    rateIDs: [displayLatestRateID, displayOlderRateID],
                    first: 1,
                },
            },
        })

        expect(firstPage.errors).toBeUndefined()
        expect(firstPage.data?.indexRatesConnection.totalCount).toBe(2)
        expect(firstPage.data?.indexRatesConnection.totalPages).toBe(2)
        expect(firstPage.data?.indexRatesConnection.edges).toHaveLength(1)
        expect(firstPage.data?.indexRatesConnection.edges[0].node.id).toBe(
            displayLatestRateID
        )
        expect(firstPage.data?.indexRatesConnection.pageInfo.hasNextPage).toBe(
            true
        )

        const secondPage = await executeGraphQLOperation(cmsServer, {
            query: IndexRatesConnectionDocument,
            variables: {
                input: {
                    rateIDs: [displayLatestRateID, displayOlderRateID],
                    first: 1,
                    after: firstPage.data?.indexRatesConnection.pageInfo
                        .endCursor,
                },
            },
        })

        expect(secondPage.errors).toBeUndefined()
        expect(secondPage.data?.indexRatesConnection.totalCount).toBe(2)
        expect(secondPage.data?.indexRatesConnection.totalPages).toBe(2)
        expect(secondPage.data?.indexRatesConnection.edges).toHaveLength(1)
        expect(secondPage.data?.indexRatesConnection.edges[0].node.id).toBe(
            displayOlderRateID
        )
        expect(secondPage.data?.indexRatesConnection.pageInfo.hasNextPage).toBe(
            false
        )
    })

    it('preserves state user authorization and state scoping with pagination', async () => {
        const ldService = testLDService({
            'rate-edit-unlock': true,
        })
        const mockS3 = testS3Client()

        const defaultStateUser = testStateUser()
        const otherStateUser = testStateUser({
            stateCode: 'VA',
            email: 'aang@mn.gov',
        })

        const defaultStateServer = await constructTestPostgresServer({
            context: {
                user: defaultStateUser,
            },
            ldService,
            s3Client: mockS3,
        })
        const otherStateServer = await constructTestPostgresServer({
            context: {
                user: otherStateUser,
            },
            ldService,
            s3Client: mockS3,
        })

        const contract1 =
            await createAndSubmitTestContractWithRate(defaultStateServer)
        const contract2 =
            await createAndSubmitTestContractWithRate(defaultStateServer)
        const contract3 = await createAndSubmitTestContractWithRate(
            otherStateServer,
            'VA'
        )

        const result = await executeGraphQLOperation(defaultStateServer, {
            query: IndexRatesConnectionDocument,
            variables: {
                input: {
                    rateIDs: [
                        contract1.packageSubmissions[0].rateRevisions[0].rateID,
                        contract2.packageSubmissions[0].rateRevisions[0].rateID,
                        contract3.packageSubmissions[0].rateRevisions[0].rateID,
                    ],
                    first: 1,
                },
            },
        })

        expect(result.errors).toBeUndefined()
        expect(result.data?.indexRatesConnection.totalCount).toBe(2)
        expect(result.data?.indexRatesConnection.totalPages).toBe(2)
        expect(result.data?.indexRatesConnection.edges).toHaveLength(1)
        expect(result.data?.indexRatesConnection.pageInfo.hasNextPage).toBe(
            true
        )
        expect(
            result.data?.indexRatesConnection.edges.every(
                (edge: RateConnectionEdge) =>
                    edge.node.stateCode === defaultStateUser.stateCode
            )
        ).toBe(true)
    })
})
