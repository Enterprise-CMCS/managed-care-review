import {
    testAdminUser,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaProgram,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    approveTestContract,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    createAndUpdateTestEQROContract,
    undoUnlockTestContract,
    submitTestContract,
    unlockTestContract,
    withdrawTestContract,
    contractHistoryToDescriptions,
    undoWithdrawTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { fetchTestRateById, must } from '../../testHelpers'
import type { RateFormDataInput, RateStrippedEdge } from '../../gen/gqlClient'
import {
    SubmitContractDocument,
    UpdateDraftContractRatesDocument,
} from '../../gen/gqlClient'
import {
    addNewRateToTestContract,
    fetchTestIndexRatesStripped,
    overrideTestRateData,
} from '../../testHelpers/gqlRateHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

const testRateFormInputData = (): RateFormDataInput => ({
    rateType: 'AMENDMENT',
    rateCapitationType: 'RATE_RANGE',
    rateDateStart: '2024-01-01',
    rateDateEnd: '2025-01-01',
    rateDateCertified: '2024-01-01',
    amendmentEffectiveDateStart: '2024-02-01',
    amendmentEffectiveDateEnd: '2025-02-01',
    rateProgramIDs: [defaultFloridaProgram().id],
    deprecatedRateProgramIDs: [],
    rateDocuments: [
        {
            s3URL: 's3://bucketname/key/test1',
            name: 'updatedratedoc1.doc',
            sha256: 'foobar',
        },
    ],
    supportingDocuments: [],
    certifyingActuaryContacts: [
        {
            name: 'Foo Person',
            titleRole: 'Bar Job',
            email: 'foo@example.com',
            actuarialFirm: 'GUIDEHOUSE',
        },
    ],
    addtlActuaryContacts: [],
    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
})

describe('withdrawContract', () => {
    const stateUser = testStateUser()
    const cmsUser = testCMSUser()

    it('can withdraw contract-only submission', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contract = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )

        await submitTestContract(stateServer, contract.id)

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        const prismaClient = await sharedTestPrismaClient()
        const contractTableRow = await prismaClient.contractTable.findUnique({
            where: { id: contract.id },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        expect(contractTableRow?.reviewStatusActions[0].actionType).toBe(
            'WITHDRAW'
        )
        expect(contractTableRow?.lastActionDate).toEqual(
            contractTableRow?.reviewStatusActions[0].updatedAt
        )

        const contractHistory = contractHistoryToDescriptions(withdrawnContract)
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(withdrawnContract.contractSubmissionType).toBe('HEALTH_PLAN')
        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw submission`,
                `CMS withdrew the submission from review. withdraw submission`,
            ])
        )
    })

    it('can withdraw contract and rate submission', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithRate(stateServer)
        await addNewRateToTestContract(stateServer, draftContract)

        const contract = await submitTestContract(stateServer, draftContract.id)

        const rateARevision = contract.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contract.packageSubmissions[0].rateRevisions[1]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        must(await unlockTestContract(cmsServer, contract.id, 'unlock'))
        must(await submitTestContract(stateServer, contract.id, 'resubmit'))

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        const contractHistory =
            await contractHistoryToDescriptions(withdrawnContract)

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)
        const rateB = await fetchTestRateById(cmsServer, rateBRevision.rateID)

        const prismaClient = await sharedTestPrismaClient()
        const contractTableRow = await prismaClient.contractTable.findUnique({
            where: { id: contract.id },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        const rateATableRow = await prismaClient.rateTable.findUnique({
            where: { id: rateARevision.rateID },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        const rateBTableRow = await prismaClient.rateTable.findUnique({
            where: { id: rateBRevision.rateID },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        expect(contractTableRow?.reviewStatusActions[0].actionType).toBe(
            'WITHDRAW'
        )
        expect(contractTableRow?.lastActionDate).toEqual(
            contractTableRow?.reviewStatusActions[0].updatedAt
        )
        expect(rateATableRow?.reviewStatusActions[0].actionType).toBe(
            'WITHDRAW'
        )
        expect(rateATableRow?.lastActionDate).toEqual(
            rateATableRow?.reviewStatusActions[0].updatedAt
        )
        expect(rateBTableRow?.reviewStatusActions[0].actionType).toBe(
            'WITHDRAW'
        )
        expect(rateBTableRow?.lastActionDate).toEqual(
            rateBTableRow?.reviewStatusActions[0].updatedAt
        )

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateB.consolidatedStatus).toBe('WITHDRAWN')
        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw submission`,
                `CMS withdrew the submission from review. withdraw submission`,
            ])
        )
    })

    it('can withdraw contract and reassigns parent contract to rates that cannot be withdrawn', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contractA.packageSubmissions[0].rateRevisions[1]
        const rateCRevision = contractA.packageSubmissions[0].rateRevisions[2]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateCRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateBRevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id)

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractC.id,
                        lastSeenUpdatedAt:
                            draftContractC.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateCRevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        // // contract C is approved, which should not allow rate C to be withdrawn
        await submitTestContract(stateServer, draftContractC.id)
        await approveTestContract(cmsServer, draftContractC.id)

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A'
        )

        const indexRatesStripped = await fetchTestIndexRatesStripped(
            cmsServer,
            contractA.stateCode
        )

        const rateA = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateARevision.rateID
        )?.node
        const rateB = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateBRevision.rateID
        )?.node
        const rateC = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateCRevision.rateID
        )?.node

        if (!rateA) {
            throw new Error('Expected rateA to exist')
        }
        if (!rateB) {
            throw new Error('Expected rateB to exist')
        }
        if (!rateC) {
            throw new Error('Expected rateC to exist')
        }

        // expect rateA to be withdrawn with the original parent contract
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.parentContractID).toBe(contractA.id)

        // expect rateB to be resubmitted and contract B to be the parent
        expect(rateB.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)

        const prismaClient = await sharedTestPrismaClient()
        const contractBTableRow = await prismaClient.contractTable.findUnique({
            where: { id: draftContractB.id },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        expect(contractBTableRow?.reviewStatusActions[0].actionType).toBe(
            'UNDER_REVIEW'
        )
        expect(contractBTableRow?.lastActionDate).toEqual(
            contractBTableRow?.reviewStatusActions[0].updatedAt
        )

        // expect rateB to be resubmitted and contract C to be the parent
        expect(rateC.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateC.parentContractID).toBe(draftContractC.id)

        const contractAHistory =
            contractHistoryToDescriptions(withdrawnContract)

        expect(contractAHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw contract A`,
                `CMS withdrew the submission from review. withdraw contract A`,
            ])
        )
    })

    it('can withdraw contract and reassigns parent contract after undo unlock and resubmit', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contractA.packageSubmissions[0].rateRevisions[1]
        const rateCRevision = contractA.packageSubmissions[0].rateRevisions[2]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateCRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateBRevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id)

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractC.id,
                        lastSeenUpdatedAt:
                            draftContractC.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateCRevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        await submitTestContract(stateServer, draftContractC.id)
        await approveTestContract(cmsServer, draftContractC.id)

        await unlockTestContract(
            cmsServer,
            contractA.id,
            'unlock before undo unlock withdrawal path'
        )

        const reversedContract = await undoUnlockTestContract(
            cmsServer,
            contractA.id,
            'reverse accidental unlock before withdrawal path'
        )

        expect(reversedContract.consolidatedStatus).toBe('SUBMITTED')
        expect(reversedContract.draftRevision).toBeNull()

        await unlockTestContract(
            cmsServer,
            contractA.id,
            'unlock again before withdrawal path'
        )

        const resubmittedContract = await submitTestContract(
            stateServer,
            contractA.id,
            'resubmit after undo unlock before withdrawal path'
        )

        expect(resubmittedContract.consolidatedStatus).toBe('RESUBMITTED')

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A after undo unlock'
        )

        const indexRatesStripped = await fetchTestIndexRatesStripped(
            cmsServer,
            contractA.stateCode
        )

        const rateA = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateARevision.rateID
        )?.node
        const rateB = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateBRevision.rateID
        )?.node
        const rateC = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateCRevision.rateID
        )?.node

        if (!rateA) {
            throw new Error('Expected rateA to exist')
        }
        if (!rateB) {
            throw new Error('Expected rateB to exist')
        }
        if (!rateC) {
            throw new Error('Expected rateC to exist')
        }

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.parentContractID).toBe(contractA.id)

        expect(rateB.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)

        expect(rateC.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateC.parentContractID).toBe(draftContractC.id)

        const contractAHistory =
            contractHistoryToDescriptions(withdrawnContract)

        expect(contractAHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                'unlock again before withdrawal path',
                'resubmit after undo unlock before withdrawal path',
                'Withdraw submission. withdraw contract A after undo unlock',
                'CMS withdrew the submission from review. withdraw contract A after undo unlock',
            ])
        )
        expect(contractAHistory).not.toContain(
            'reverse accidental unlock before withdrawal path'
        )
    })

    it('can withdraw contract and reassigns multiple rates to the same parent contract', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]
        const rateBRevision = contractA.packageSubmissions[0].rateRevisions[1]
        const rateCRevision = contractA.packageSubmissions[0].rateRevisions[2]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateCRevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateBRevision.rateID,
                            },
                            {
                                type: 'LINK',
                                rateID: rateCRevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id)

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A'
        )

        const indexRatesStripped = await fetchTestIndexRatesStripped(
            cmsServer,
            contractA.stateCode
        )

        const rateA = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateARevision.rateID
        )?.node
        const rateB = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateBRevision.rateID
        )?.node
        const rateC = indexRatesStripped.edges.find(
            (edge: RateStrippedEdge) => edge.node.id === rateCRevision.rateID
        )?.node

        if (!rateA) {
            throw new Error('Expected rateA to exist')
        }
        if (!rateB) {
            throw new Error('Expected rateB to exist')
        }
        if (!rateC) {
            throw new Error('Expected rateC to exist')
        }

        // expect rateA to be withdrawn with the original parent contract
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.parentContractID).toBe(contractA.id)

        // expect rateB to be resubmitted and contract B to be the parent
        expect(rateB.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)

        // expect rateC to be resubmitted and contract B to be the parent
        expect(rateC.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateC.parentContractID).toBe(draftContractB.id)

        const contractAHistory =
            await contractHistoryToDescriptions(withdrawnContract)

        expect(contractAHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw contract A`,
                `CMS withdrew the submission from review. withdraw contract A`,
            ])
        )
    })

    it('prioritizes submitted contracts for rate parent contract reassignment', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id)

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractC.id,
                        lastSeenUpdatedAt:
                            draftContractC.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        await submitTestContract(stateServer, draftContractC.id)
        await approveTestContract(cmsServer, draftContractC.id)

        const draftContractD =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractD.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractD.id,
                        lastSeenUpdatedAt:
                            draftContractD.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        await submitTestContract(stateServer, draftContractD.id)
        await unlockTestContract(
            cmsServer,
            draftContractD.id,
            'unlock contract D'
        )

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A'
        )

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        // expect contract A to be withdrawn
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')

        // expect rate A to be resubmitted and its new parent contract is B.
        expect(rateA.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateA.parentContractID).toBe(draftContractB.id)
    })

    it('prioritizes unlocked contracts for rate parent contract reassignment when there are no submitted contracts', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        await submitTestContract(stateServer, draftContractB.id)
        await unlockTestContract(
            cmsServer,
            draftContractB.id,
            'unlock and should be parent contract of rate A'
        )

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractC.id,
                        lastSeenUpdatedAt:
                            draftContractC.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        // // contract C is approved, which should not allow rate C to be withdrawn
        await submitTestContract(stateServer, draftContractC.id)
        await approveTestContract(cmsServer, draftContractC.id)

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A'
        )

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        // expect rateA to be withdrawn with the original parent contract
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')

        // expect rate B to be unlocked and its new parent contract is B.
        expect(rateA.consolidatedStatus).toBe('UNLOCKED')
        expect(rateA.parentContractID).toBe(draftContractB.id)
    })

    it('withdraws rate with reassigned parent', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithRate(stateServer)
        await addNewRateToTestContract(stateServer, draftContract)

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        // leave contract B submitted, which should not allow rate B to be withdrawn
        await submitTestContract(stateServer, draftContractB.id)

        //withdraw contractA
        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contractA'
        )

        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        // expect contractA to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')
        // expect rateB to be resubmitted and contractB to be its new parent
        expect(rateA.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateA.parentContractID).toBe(draftContractB.id)

        // withdraw contractB
        const withdrawnContractB = await withdrawTestContract(
            cmsServer,
            draftContractB.id,
            'withdraw contractB'
        )
        const withdrawnRateA = await fetchTestRateById(cmsServer, rateA.id)
        // expect contractB to be withdrawn
        expect(withdrawnContractB.consolidatedStatus).toBe('WITHDRAWN')
        // expect rateB to now be withdrawn since parent submission is also withdrawn
        expect(withdrawnRateA.consolidatedStatus).toBe('WITHDRAWN')
    })

    it('withdraws rate with parent when linked contract is unlocked without previously submitting with linked rate', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithRate(stateServer)

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateARevision = contractA.packageSubmissions[0].rateRevisions[0]

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateARevision.rateID,
                            },
                        ],
                    },
                },
            })
        )

        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw contract A'
        )
        const rateA = await fetchTestRateById(cmsServer, rateARevision.rateID)

        //expect contract to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')
        // expect rate to be withdrawn even though it is linked to unlocked contract b
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')

        // try to resubmit unlocked contract linked to rate without previously having submitted with it.
        const resubmitContractB = await executeGraphQLOperation(stateServer, {
            query: SubmitContractDocument,
            variables: {
                input: {
                    contractID: draftContractB.id,
                    submittedReason: 'Trying to submit with a withdrawn rate',
                },
            },
        })

        // expect errors when trying to resubmit with a withdrawn rate
        expect(resubmitContractB.errors).toBeDefined()
        // expect error to be rateA in withdrawn status
        expect(resubmitContractB.errors?.[0].message).toBe(
            `Attempted to submit a contract with a withdrawn rate. Rate id: ${rateA.id}`
        )
    })

    it('sends emails to state and CMS when a submission is withdrawn', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer()
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        const contract = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )

        await submitTestContract(stateServer, contract.id)

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        const contractName =
            withdrawnContract.packageSubmissions[0].contractRevision
                .contractName
        const stateReceiverEmails =
            withdrawnContract.packageSubmissions[0].contractRevision.formData.stateContacts.map(
                (contact) => contact.email
            )

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${contractName} was withdrawn by CMS`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(stateReceiverEmails),
                bodyHTML: expect.stringContaining(contractName),
            })
        )

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${contractName} was withdrawn by CMS`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().devReviewTeamEmails,
                    ...testEmailConfig().dmcpSubmissionEmails,
                    ...testEmailConfig().dmcoEmails,
                    ...testEmailConfig().oactEmails,
                ]),
                bodyHTML: expect.stringContaining(contractName),
            })
        )
    })

    it('sends emails only to DMCO and dev review team when an EQRO submission is withdrawn', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer()
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        const draft = await createAndUpdateTestEQROContract(
            stateServer,
            undefined,
            {
                eqroNewContractor: true,
                eqroProvisionMcoNewOptionalActivity: true,
                eqroProvisionNewMcoEqrRelatedActivities: true,
                eqroProvisionChipEqrRelatedActivities: true,
                eqroProvisionMcoEqrOrRelatedActivities: null,
            }
        )

        const submittedContract = await submitTestContract(
            stateServer,
            draft.id
        )
        expect(submittedContract.contractSubmissionType).toBe('EQRO')
        expect(submittedContract.consolidatedStatus).toBe('SUBMITTED')

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            submittedContract.id,
            'withdraw EQRO submission'
        )

        const contractName =
            withdrawnContract.packageSubmissions[0].contractRevision
                .contractName

        // CMS email (first call): only DMCO + dev review team
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${contractName} was withdrawn by CMS`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining([
                    ...emailConfig.dmcoEmails,
                    ...emailConfig.devReviewTeamEmails,
                ]),
                bodyHTML: expect.stringContaining(contractName),
            })
        )

        // Confirm EQRO-excluded recipients are not included
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                toAddresses: expect.not.arrayContaining([
                    ...emailConfig.dmcpSubmissionEmails,
                    ...emailConfig.oactEmails,
                ]),
            })
        )

        // State email (second call): includes state contacts + dev review team
        const stateReceiverEmails =
            withdrawnContract.packageSubmissions[0].contractRevision.formData.stateContacts.map(
                (contact) => contact.email
            )

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${contractName} was withdrawn by CMS`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining([
                    ...stateReceiverEmails,
                    ...emailConfig.devReviewTeamEmails,
                ]),
                bodyHTML: expect.stringContaining(contractName),
            })
        )
    })

    it('can withdraw and undo withdraw contract and rate submission with rate overrides', async () => {
        const adminUser = testAdminUser()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithRate(stateServer)

        const contract = await submitTestContract(stateServer, draftContract.id)

        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID

        must(await unlockTestContract(cmsServer, contract.id, 'unlock'))
        must(await submitTestContract(stateServer, contract.id, 'resubmit'))

        const newDate = new Date('2025-05-05')

        const rate = await fetchTestRateById(cmsServer, rateID)

        const rateARevision = rate.packageSubmissions?.[0]?.rateRevision

        if (!rateARevision) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const rateDocuments = rateARevision.formData.rateDocuments
        const supportingDocuments = rateARevision.formData.supportingDocuments

        // add overrides to rate
        await overrideTestRateData(adminServer, {
            rateID: rateID,
            description: 'Add overrides',
            overrides: {
                initiallySubmittedAt: newDate,
                initiallySubmittedAtOp: 'OVERRIDE',
                revisionOverride: {
                    rateDocuments: rateDocuments.map((doc) => ({
                        documentOp: 'OVERRIDE',
                        documentSha256: doc.sha256!,
                        documentID: doc.id!,
                        dateAddedOp: 'OVERRIDE',
                        dateAdded: newDate,
                    })),
                    supportingDocuments: supportingDocuments.map((doc) => ({
                        documentOp: 'OVERRIDE',
                        documentSha256: doc.sha256!,
                        documentID: doc.id!,
                        dateAddedOp: 'OVERRIDE',
                        dateAdded: newDate,
                    })),
                },
            },
        })

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        const withdrawnRate = await fetchTestRateById(cmsServer, rateID)

        const contractHistory =
            await contractHistoryToDescriptions(withdrawnContract)

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(withdrawnRate.consolidatedStatus).toBe('WITHDRAWN')
        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                `Withdraw submission. withdraw submission`,
                `CMS withdrew the submission from review. withdraw submission`,
            ])
        )

        // expect overrides to still be applied
        expect(withdrawnRate.initiallySubmittedAt).toStrictEqual(newDate)
        // Expect rate documents to have override dateAdded
        expect(
            withdrawnRate.packageSubmissions?.[0]?.rateRevision.formData
                .rateDocuments
        ).toEqual(
            expect.arrayContaining(
                rateDocuments.map((doc) =>
                    expect.objectContaining({
                        sha256: doc.sha256,
                        dateAdded: newDate,
                    })
                )
            )
        )

        // Expect supporting documents to have override dateAdded
        expect(
            withdrawnRate.packageSubmissions?.[0]?.rateRevision.formData
                .supportingDocuments
        ).toEqual(
            expect.arrayContaining(
                supportingDocuments.map((doc) =>
                    expect.objectContaining({
                        sha256: doc.sha256,
                        dateAdded: newDate,
                    })
                )
            )
        )

        const unwithdrawnContract = await undoWithdrawTestContract(
            cmsServer,
            contract.id,
            'Undo withdraw and varify overrides'
        )
        const unwithdrawnRate = await fetchTestRateById(cmsServer, rateID)

        expect(unwithdrawnContract.consolidatedStatus).toBe('RESUBMITTED')
        expect(unwithdrawnRate.consolidatedStatus).toBe('RESUBMITTED')

        // expect overrides to still be applied
        expect(unwithdrawnRate.initiallySubmittedAt).toStrictEqual(newDate)
        // Expect rate documents to have override dateAdded
        expect(
            unwithdrawnRate.packageSubmissions?.[0]?.rateRevision.formData
                .rateDocuments
        ).toEqual(
            expect.arrayContaining(
                rateDocuments.map((doc) =>
                    expect.objectContaining({
                        sha256: doc.sha256,
                        dateAdded: newDate,
                    })
                )
            )
        )

        // Expect supporting documents to have override dateAdded
        expect(
            unwithdrawnRate.packageSubmissions?.[0]?.rateRevision.formData
                .supportingDocuments
        ).toEqual(
            expect.arrayContaining(
                supportingDocuments.map((doc) =>
                    expect.objectContaining({
                        sha256: doc.sha256,
                        dateAdded: newDate,
                    })
                )
            )
        )
    })

    it('can withdraw EQRO or CHIP-only HEALTH_PLAN contract with NOT_SUBJECT_TO_REVIEW status', async () => {
        const stateServer = await constructTestPostgresServer({
            context: { user: stateUser },
            ldService: testLDService({
                'chip-submission-automation': true,
            }),
        })
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })

        // EQRO: all-false provision fields trigger NOT_SUBJECT_TO_REVIEW on submit
        const eqroDraft = await createAndUpdateTestEQROContract(
            stateServer,
            undefined,
            {
                eqroNewContractor: false,
                eqroProvisionMcoNewOptionalActivity: false,
                eqroProvisionNewMcoEqrRelatedActivities: false,
                eqroProvisionChipEqrRelatedActivities: false,
                eqroProvisionMcoEqrOrRelatedActivities: null,
            }
        )
        const eqroSubmitted = await submitTestContract(
            stateServer,
            eqroDraft.id
        )
        expect(eqroSubmitted.contractSubmissionType).toBe('EQRO')
        expect(eqroSubmitted.consolidatedStatus).toBe('NOT_SUBJECT_TO_REVIEW')

        const chipDraft = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
                populationCovered: 'CHIP',
                federalAuthorities: ['TITLE_XXI'],
            }
        )
        const chipSubmitted = await submitTestContract(
            stateServer,
            chipDraft.id
        )
        expect(chipSubmitted.contractSubmissionType).toBe('HEALTH_PLAN')
        expect(chipSubmitted.consolidatedStatus).toBe('NOT_SUBJECT_TO_REVIEW')

        const eqroWithdrawn = await withdrawTestContract(
            cmsServer,
            eqroSubmitted.id,
            'withdraw EQRO submission'
        )
        expect(eqroWithdrawn.consolidatedStatus).toBe('WITHDRAWN')

        const chipWithdrawn = await withdrawTestContract(
            cmsServer,
            chipSubmitted.id,
            'withdraw CHIP submission'
        )
        expect(chipWithdrawn.consolidatedStatus).toBe('WITHDRAWN')
    })

    it('can withdraw EQRO contract with SUBMITTED status', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // At least one EQRO provision field true -> UNDER_REVIEW / SUBMITTED
        const draft = await createAndUpdateTestEQROContract(
            stateServer,
            undefined,
            {
                eqroNewContractor: true,
                eqroProvisionMcoNewOptionalActivity: true,
                eqroProvisionNewMcoEqrRelatedActivities: true,
                eqroProvisionChipEqrRelatedActivities: true,
                eqroProvisionMcoEqrOrRelatedActivities: null,
            }
        )

        const submittedContract = await submitTestContract(
            stateServer,
            draft.id
        )
        expect(submittedContract.consolidatedStatus).toBe('SUBMITTED')

        must(
            await unlockTestContract(
                cmsServer,
                submittedContract.id,
                'unlock EQRO submission'
            )
        )
        const resubmittedContract = must(
            await submitTestContract(
                stateServer,
                submittedContract.id,
                'resubmit EQRO'
            )
        )
        expect(resubmittedContract.consolidatedStatus).toBe('RESUBMITTED')

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            resubmittedContract.id,
            'withdraw EQRO submission'
        )

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')

        const contractHistory = contractHistoryToDescriptions(withdrawnContract)
        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                'unlock EQRO submission',
                'resubmit EQRO',
                'Withdraw submission. withdraw EQRO submission',
                'CMS withdrew the submission from review. withdraw EQRO submission',
            ])
        )
    })
})
