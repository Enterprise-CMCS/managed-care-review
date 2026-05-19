import { IndexRatesPaginatedDocument } from '../../gen/gqlClient'
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

describe('indexRatesPaginated', () => {
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
                    query: IndexRatesPaginatedDocument,
                    variables: {
                        input: {
                            rateIDs,
                            pageSize: 2,
                        },
                    },
                })

                expect(firstPage.errors).toBeUndefined()
                expect(firstPage.data?.indexRatesPaginated.totalCount).toBe(3)
                expect(firstPage.data?.indexRatesPaginated.totalPages).toBe(2)
                expect(firstPage.data?.indexRatesPaginated.edges).toHaveLength(
                    2
                )
                expect(
                    firstPage.data?.indexRatesPaginated.pageInfo.hasNextPage
                ).toBe(true)
                expect(
                    firstPage.data?.indexRatesPaginated.pageInfo.endCursor
                ).toBe(firstPage.data?.indexRatesPaginated.edges[1].cursor)

                const firstPageIDs =
                    firstPage.data?.indexRatesPaginated.edges.map(
                        (edge: RateConnectionEdge) => edge.node.id
                    )

                const secondPage = await executeGraphQLOperation(cmsServer, {
                    query: IndexRatesPaginatedDocument,
                    variables: {
                        input: {
                            rateIDs,
                            pageSize: 2,
                            after: firstPage.data?.indexRatesPaginated.pageInfo
                                .endCursor,
                        },
                    },
                })

                expect(secondPage.errors).toBeUndefined()
                expect(secondPage.data?.indexRatesPaginated.totalCount).toBe(3)
                expect(secondPage.data?.indexRatesPaginated.totalPages).toBe(2)
                expect(secondPage.data?.indexRatesPaginated.edges).toHaveLength(
                    1
                )
                expect(
                    secondPage.data?.indexRatesPaginated.pageInfo.hasNextPage
                ).toBe(false)
                expect(
                    secondPage.data?.indexRatesPaginated.pageInfo.endCursor
                ).toBe(secondPage.data?.indexRatesPaginated.edges[0].cursor)

                const secondPageIDs =
                    secondPage.data?.indexRatesPaginated.edges.map(
                        (edge: RateConnectionEdge) => edge.node.id
                    )

                expect(firstPageIDs).toBeDefined()
                expect(secondPageIDs).toBeDefined()
                expect(
                    [...(firstPageIDs ?? []), ...(secondPageIDs ?? [])].sort()
                ).toEqual([...rateIDs].sort())
            })

            it('returns BAD_USER_INPUT when pageSize exceeds the page size limit', async () => {
                const cmsUser = mockUser()
                const cmsServer = await constructTestPostgresServer({
                    context: { user: cmsUser },
                    ldService,
                    s3Client: mockS3,
                })

                const result = await executeGraphQLOperation(cmsServer, {
                    query: IndexRatesPaginatedDocument,
                    variables: {
                        input: {
                            pageSize: 151,
                        },
                    },
                })

                expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
                expect(result.errors?.[0].message).toContain(
                    'pageSize must be between 1 and 150'
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
                    query: IndexRatesPaginatedDocument,
                    variables: {
                        input: {
                            after: 'not-a-cursor',
                        },
                    },
                })

                expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
                expect(result.errors?.[0].message).toContain(
                    'normalizeAfterCursor failed. Cursor is not a valid rate pagination cursor'
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
            query: IndexRatesPaginatedDocument,
            variables: {
                input: {
                    rateIDs: [displayLatestRateID, displayOlderRateID],
                    pageSize: 1,
                },
            },
        })

        expect(firstPage.errors).toBeUndefined()
        expect(firstPage.data?.indexRatesPaginated.totalCount).toBe(2)
        expect(firstPage.data?.indexRatesPaginated.totalPages).toBe(2)
        expect(firstPage.data?.indexRatesPaginated.edges).toHaveLength(1)
        expect(firstPage.data?.indexRatesPaginated.edges[0].node.id).toBe(
            displayLatestRateID
        )
        expect(firstPage.data?.indexRatesPaginated.pageInfo.hasNextPage).toBe(
            true
        )

        const secondPage = await executeGraphQLOperation(cmsServer, {
            query: IndexRatesPaginatedDocument,
            variables: {
                input: {
                    rateIDs: [displayLatestRateID, displayOlderRateID],
                    pageSize: 1,
                    after: firstPage.data?.indexRatesPaginated.pageInfo
                        .endCursor,
                },
            },
        })

        expect(secondPage.errors).toBeUndefined()
        expect(secondPage.data?.indexRatesPaginated.totalCount).toBe(2)
        expect(secondPage.data?.indexRatesPaginated.totalPages).toBe(2)
        expect(secondPage.data?.indexRatesPaginated.edges).toHaveLength(1)
        expect(secondPage.data?.indexRatesPaginated.edges[0].node.id).toBe(
            displayOlderRateID
        )
        expect(secondPage.data?.indexRatesPaginated.pageInfo.hasNextPage).toBe(
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
            query: IndexRatesPaginatedDocument,
            variables: {
                input: {
                    rateIDs: [
                        contract1.packageSubmissions[0].rateRevisions[0].rateID,
                        contract2.packageSubmissions[0].rateRevisions[0].rateID,
                        contract3.packageSubmissions[0].rateRevisions[0].rateID,
                    ],
                    pageSize: 1,
                },
            },
        })

        expect(result.errors).toBeUndefined()
        expect(result.data?.indexRatesPaginated.totalCount).toBe(2)
        expect(result.data?.indexRatesPaginated.totalPages).toBe(2)
        expect(result.data?.indexRatesPaginated.edges).toHaveLength(1)
        expect(result.data?.indexRatesPaginated.pageInfo.hasNextPage).toBe(true)
        expect(
            result.data?.indexRatesPaginated.edges.every(
                (edge: RateConnectionEdge) =>
                    edge.node.stateCode === defaultStateUser.stateCode
            )
        ).toBe(true)
    })
})
