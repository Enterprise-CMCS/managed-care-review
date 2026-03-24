import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import type {
    ContractStripped,
    ContractStrippedEdge,
    Contract,
} from '../../gen/gqlClient'
import { IndexContractsStrippedDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import type { ApolloServer } from '@apollo/server'
import {
    testAdminUser,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    submitTestContract,
    unlockTestContract,
    updateTestContractDraftRevision,
    resubmitTestContract,
    createAndUpdateTestEQROContract,
    withdrawTestContract,
    approveTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('indexContractsStripped', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    let stateServer: ApolloServer
    let cmsServer: ApolloServer
    let flStateServer: ApolloServer
    let vaStateServer: ApolloServer

    // Shared test data created once
    let submittedContract: Contract
    let toBeResubmittedContract: Contract
    let unlockedContract: Contract
    let approvedContract: Contract
    let submittedEqroContract: Contract
    let draftContract1: Contract
    let draftContract2: Contract

    beforeAll(async () => {
        stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
            s3Client: mockS3,
        })
        flStateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'FL',
                    email: 'aang-fl@example.com',
                }),
            },
            ldService,
            s3Client: mockS3,
        })
        vaStateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser({
                    stateCode: 'VA',
                    email: 'aang-va@example.com',
                }),
            },
            ldService,
        })

        // Create all test contracts
        submittedContract =
            await createAndSubmitTestContractWithRate(flStateServer)
        toBeResubmittedContract = await createAndSubmitTestContractWithRate(
            vaStateServer,
            'VA'
        )

        unlockedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        await unlockTestContract(
            cmsServer,
            unlockedContract.id,
            'unlocking contract'
        )

        approvedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        await approveTestContract(cmsServer, approvedContract.id)

        const eqroDraft = await createAndUpdateTestEQROContract(stateServer)
        submittedEqroContract = await submitTestContract(
            stateServer,
            eqroDraft.id
        )

        // Draft contracts (never submitted)
        draftContract1 =
            await createAndUpdateTestContractWithoutRates(stateServer)
        draftContract2 =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // Multi-state contracts
    }, 30000)

    it('returns stripped submitted contract with correct shape', async () => {
        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
            variables: {
                input: { contractIDs: [submittedContract.id] },
            },
        })

        expect(result.errors).toBeUndefined()
        const allNodes: ContractStripped[] =
            result.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )
        const stripped = allNodes.find((c) => c.id === submittedContract.id)

        expect(stripped).toBeDefined()
        expect(stripped!.initiallySubmittedAt).toBeDefined()
        expect(stripped).toMatchObject({
            stateCode: 'FL',
            consolidatedStatus: 'SUBMITTED',
            contractSubmissionType: 'HEALTH_PLAN',
            draftRevision: null,
            latestSubmittedRevision: {
                contractID: expect.any(String),
                contractName: expect.stringMatching(/.+/),
                submitInfo: {
                    updatedAt: expect.any(Date),
                    updatedBy: expect.anything(),
                    updatedReason: expect.anything(),
                },
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    contractType: 'BASE',
                    populationCovered: 'MEDICAID',
                    contractDateStart: expect.any(String),
                    contractDateEnd: expect.any(String),
                },
            },
        })
    })

    it('returns stripped unlocked contract with draft revision', async () => {
        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
            variables: {
                input: { contractIDs: [unlockedContract.id] },
            },
        })

        expect(result.errors).toBeUndefined()
        const allNodes: ContractStripped[] =
            result.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )
        const stripped = allNodes.find((c) => c.id === unlockedContract.id)

        expect(stripped).toBeDefined()
        expect(stripped!.initiallySubmittedAt).toBeDefined()
        expect(stripped).toMatchObject({
            stateCode: 'FL',
            consolidatedStatus: 'UNLOCKED',
            contractSubmissionType: 'HEALTH_PLAN',
            draftRevision: {
                unlockInfo: {
                    updatedReason: 'unlocking contract',
                },
            },
            latestSubmittedRevision: {
                contractID: expect.any(String),
                contractName: expect.stringMatching(/.+/),
                submitInfo: {
                    updatedAt: expect.any(Date),
                    updatedBy: expect.anything(),
                    updatedReason: expect.anything(),
                },
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    contractType: 'BASE',
                    populationCovered: 'MEDICAID',
                    contractDateStart: expect.any(String),
                    contractDateEnd: expect.any(String),
                },
            },
        })
    })

    it('returns stripped approved contract with correct status', async () => {
        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
            variables: {
                input: { contractIDs: [approvedContract.id] },
            },
        })

        expect(result.errors).toBeUndefined()
        const allNodes: ContractStripped[] =
            result.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )
        const stripped = allNodes.find((c) => c.id === approvedContract.id)

        expect(stripped).toBeDefined()
        expect(stripped!.initiallySubmittedAt).toBeDefined()
        expect(stripped).toMatchObject({
            stateCode: 'FL',
            consolidatedStatus: 'APPROVED',
            contractSubmissionType: 'HEALTH_PLAN',
            draftRevision: null,
            latestSubmittedRevision: {
                contractID: expect.any(String),
                contractName: expect.stringMatching(/.+/),
                submitInfo: {
                    updatedAt: expect.any(Date),
                    updatedBy: expect.anything(),
                    updatedReason: expect.anything(),
                },
                formData: {
                    submissionType: 'CONTRACT_AND_RATES',
                    contractType: 'BASE',
                    populationCovered: 'MEDICAID',
                    contractDateStart: expect.any(String),
                    contractDateEnd: expect.any(String),
                },
            },
        })
    })

    it('returns stripped EQRO contract with correct shape', async () => {
        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
            variables: {
                input: { contractIDs: [submittedEqroContract.id] },
            },
        })

        expect(result.errors).toBeUndefined()
        const allNodes: ContractStripped[] =
            result.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )
        const stripped = allNodes.find((c) => c.id === submittedEqroContract.id)

        expect(stripped).toBeDefined()
        expect(stripped!.initiallySubmittedAt).toBeDefined()
        expect(stripped).toMatchObject({
            stateCode: 'FL',
            consolidatedStatus: 'SUBMITTED',
            contractSubmissionType: 'EQRO',
            draftRevision: null,
            latestSubmittedRevision: {
                contractID: expect.any(String),
                contractName: expect.stringMatching(/.+/),
                submitInfo: {
                    updatedAt: expect.any(Date),
                    updatedBy: expect.anything(),
                    updatedReason: expect.anything(),
                },
                formData: {
                    submissionType: 'CONTRACT_ONLY',
                    contractType: 'BASE',
                    populationCovered: 'MEDICAID_AND_CHIP',
                    contractDateStart: expect.any(String),
                    contractDateEnd: expect.any(String),
                },
            },
        })
    })

    it('returns correct data after withdraw', async () => {
        await withdrawTestContract(
            cmsServer,
            submittedContract.id,
            'withdrawing contract'
        )

        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
            variables: {
                input: { contractIDs: [submittedContract.id] },
            },
        })

        expect(result.errors).toBeUndefined()
        const withdrawn: ContractStripped =
            result.data?.indexContractsStripped.edges
                .map((edge: ContractStrippedEdge) => edge.node)
                .find((c: ContractStripped) => c.id === submittedContract.id)

        expect(withdrawn).toBeDefined()
        expect(withdrawn.consolidatedStatus).toBe('WITHDRAWN')
    })

    it('returns correct latestSubmittedRevision after resubmit', async () => {
        await unlockTestContract(
            cmsServer,
            toBeResubmittedContract.id,
            'unlock for resubmit'
        )
        await updateTestContractDraftRevision(
            vaStateServer,
            toBeResubmittedContract.id,
            undefined,
            {
                populationCovered: 'MEDICAID_AND_CHIP',
            }
        )
        await resubmitTestContract(
            vaStateServer,
            toBeResubmittedContract.id,
            'resubmitting with updated population'
        )

        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
            variables: {
                input: { contractIDs: [toBeResubmittedContract.id] },
            },
        })

        expect(result.errors).toBeUndefined()
        const resubmitted: ContractStripped =
            result.data?.indexContractsStripped.edges
                .map((edge: ContractStrippedEdge) => edge.node)
                .find(
                    (c: ContractStripped) => c.id === toBeResubmittedContract.id
                )

        expect(resubmitted).toBeDefined()
        expect(resubmitted.status).toBe('RESUBMITTED')
        expect(resubmitted.draftRevision).toBeNull()

        const rev = resubmitted.latestSubmittedRevision

        if (!rev) {
            throw new Error(
                'Unexpected error: Expected latestSubmittedRevision to exist.'
            )
        }

        expect(rev.submitInfo).toBeDefined()
        expect(rev.unlockInfo).toBeDefined()
        expect(rev.formData.populationCovered).toBe('MEDICAID_AND_CHIP')
    })

    it('returns overridden initiallySubmittedAt for contract', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const adminUser = testAdminUser()

        // Ensure admin user exists in DB for the override relation
        await prismaClient.user.upsert({
            where: { id: adminUser.id },
            update: {},
            create: {
                id: adminUser.id,
                givenName: adminUser.givenName,
                familyName: adminUser.familyName,
                email: adminUser.email,
                role: adminUser.role,
            },
        })

        const overrideDate = new Date('2020-01-15')

        // Insert contract override directly via Prisma
        await prismaClient.contractOverrides.create({
            data: {
                contractID: approvedContract.id,
                updatedByID: adminUser.id,
                description: 'Override initiallySubmittedAt for test',
                initiallySubmittedAt: overrideDate,
            },
        })

        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
            variables: {
                input: { contractIDs: [approvedContract.id] },
            },
        })

        expect(result.errors).toBeUndefined()
        const allNodes: ContractStripped[] =
            result.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )
        const stripped = allNodes.find((c) => c.id === approvedContract.id)

        expect(stripped).toBeDefined()
        expect(stripped!.initiallySubmittedAt).toEqual(overrideDate)
    })

    it('does not return contracts still in initial draft', async () => {
        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
        })

        expect(result.errors).toBeUndefined()

        const allNodes: ContractStripped[] =
            result.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )

        const drafts = allNodes.filter((c) =>
            [draftContract1.id, draftContract2.id].includes(c.id)
        )

        expect(drafts).toHaveLength(0)
    })

    it('returns contracts from multiple states for cms user', async () => {
        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexContractsStrippedDocument,
        })

        expect(result.errors).toBeUndefined()

        const allNodes: ContractStripped[] =
            result.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node
            )

        const flContracts = allNodes.filter(
            (c) => c.id === submittedContract.id
        )
        const vaContracts = allNodes.filter(
            (c) => c.id === toBeResubmittedContract.id
        )

        expect(flContracts).toHaveLength(1)
        expect(vaContracts).toHaveLength(1)
    })

    it('only returns state users own contracts', async () => {
        const floridaResult = await executeGraphQLOperation(flStateServer, {
            query: IndexContractsStrippedDocument,
        })

        expect(floridaResult.errors).toBeUndefined()
        const floridaStateCodes: string[] =
            floridaResult.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node.stateCode
            )

        expect(floridaStateCodes.every((code) => code === 'FL')).toBe(true)

        const virginiaResult = await executeGraphQLOperation(vaStateServer, {
            query: IndexContractsStrippedDocument,
        })

        expect(virginiaResult.errors).toBeUndefined()
        const virginiaStateCodes: string[] =
            virginiaResult.data?.indexContractsStripped.edges.map(
                (edge: ContractStrippedEdge) => edge.node.stateCode
            )

        expect(virginiaStateCodes.every((code) => code === 'VA')).toBe(true)
    })
})
