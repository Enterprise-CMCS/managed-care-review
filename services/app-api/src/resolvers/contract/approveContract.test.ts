import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { ApproveContractDocument } from '../../gen/gqlClient'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    createTestContract,
    unlockTestContract,
    createAndSubmitTestContractWithRate,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

describe('approveContract', () => {
    const mockS3 = testS3Client()

    it('approves the contract', async () => {
        const client = await sharedTestPrismaClient()
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const approvedContract = await approveTestContract(
            cmsServer,
            contract.id
        )
        // chip-submission-automation is on by default, so submitting the
        // HEALTH_PLAN contract records an UNDER_REVIEW determination action, and
        // approving appends a MARK_AS_APPROVED action, so both are present.
        expect(approvedContract.reviewStatusActions).toHaveLength(2)
        expect(approvedContract.contractSubmissionType).toBe('HEALTH_PLAN')

        const submitReviewAction = approvedContract.reviewStatusActions?.find(
            (action) => action.actionType === 'UNDER_REVIEW'
        )
        const approvalAction = approvedContract.reviewStatusActions?.find(
            (action) => action.actionType === 'MARK_AS_APPROVED'
        )

        expect(submitReviewAction).toBeDefined()
        expect(approvalAction).toBeDefined()
        expect(approvalAction?.contractID).toBe(approvedContract.id)
        expect(approvalAction?.updatedReason).toBeNull()
        expect(approvedContract.reviewStatus).toBe('APPROVED')

        const contractTableRow = await client.contractTable.findUniqueOrThrow({
            where: { id: approvedContract.id },
            select: { lastActionDate: true },
        })

        // Approval is the latest review action, so the stored action date should
        // match the approval action timestamp.
        expect(contractTableRow.lastActionDate).toEqual(
            approvalAction?.updatedAt
        )
    })

    it('stores approval reason when provided', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const approvedContract = await approveTestContract(
            cmsServer,
            contract.id,
            '2024-11-11',
            'Approval letter sent to state'
        )

        expect(approvedContract.reviewStatusActions?.[0]?.updatedReason).toBe(
            'Approval letter sent to state'
        )
    })

    it('allows admin users to approve when a reason is provided', async () => {
        const adminServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testAdminUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const approvedContract = await approveTestContract(
            adminServer,
            contract.id,
            '2024-11-11',
            'Admin approval override'
        )

        expect(approvedContract.reviewStatus).toBe('APPROVED')
        expect(approvedContract.reviewStatusActions?.[0]?.updatedReason).toBe(
            'Admin approval override'
        )
    })

    it('errors if admin approves without a reason', async () => {
        const adminServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testAdminUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const approveContractResult = await executeGraphQLOperation(
            adminServer,
            {
                query: ApproveContractDocument,
                variables: {
                    input: {
                        contractID: contract.id,
                        dateApprovalReleasedToState: '2024-12-12',
                    },
                },
            }
        )

        expect(approveContractResult.errors).toBeDefined()
        if (approveContractResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(approveContractResult.errors[0].extensions?.code).toBe(
            'BAD_USER_INPUT'
        )
        expect(approveContractResult.errors[0].message).toBe(
            'Approving a contract as an admin requires a reason'
        )
    })

    it('errors if contract status is in DRAFT', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

        const draftContract = await createTestContract(stateServer)

        const approveContractResult = await executeGraphQLOperation(cmsServer, {
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: draftContract.id,
                    dateApprovalReleasedToState: '2024-12-12',
                },
            },
        })

        expect(approveContractResult.errors).toBeDefined()
        if (approveContractResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(approveContractResult.errors[0].extensions?.code).toBe(
            'BAD_USER_INPUT'
        )
        expect(approveContractResult.errors[0].message).toBe(
            'Attempted to approve contract with wrong status: DRAFT'
        )
    })

    it('errors if contract status is UNLOCKED', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const unlockedContract = await unlockTestContract(
            cmsServer,
            contract.id,
            'unlock to resubmit'
        )

        const approveContractResult = await executeGraphQLOperation(cmsServer, {
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: unlockedContract.id,
                    dateApprovalReleasedToState: '2024-12-12',
                },
            },
        })

        expect(approveContractResult.errors).toBeDefined()
        if (approveContractResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(approveContractResult.errors[0].extensions?.code).toBe(
            'BAD_USER_INPUT'
        )
        expect(approveContractResult.errors[0].message).toBe(
            'Attempted to approve contract with wrong status: UNLOCKED'
        )
    })

    it('errors if contract review status is APPROVED', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        await approveTestContract(cmsServer, contract.id, '2024-11-11')

        const secondApprovalResult = await executeGraphQLOperation(cmsServer, {
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    dateApprovalReleasedToState: '2024-12-12',
                },
            },
        })

        expect(secondApprovalResult.errors).toBeDefined()
        if (secondApprovalResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(secondApprovalResult.errors[0].extensions?.code).toBe(
            'BAD_USER_INPUT'
        )
        expect(secondApprovalResult.errors[0].message).toBe(
            'Attempted to approve contract with wrong status: APPROVED'
        )
    })

    it('errors if date approval released is a future date', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const approveContractResult = await executeGraphQLOperation(cmsServer, {
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    dateApprovalReleasedToState: '3009-11-11',
                },
            },
        })
        expect(approveContractResult.errors).toBeDefined()
        if (approveContractResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(approveContractResult.errors[0].extensions?.code).toBe(
            'BAD_USER_INPUT'
        )
        expect(approveContractResult.errors[0].message).toContain(
            'Attempted to approve contract with invalid approval release date'
        )
    })

    it('errors if a non CMS/CMS Approver/Admin user calls it', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const approveContractResult = await executeGraphQLOperation(
            stateServer,
            {
                query: ApproveContractDocument,
                variables: {
                    input: {
                        contractID: contract.id,
                        dateApprovalReleasedToState: '2024-12-12',
                    },
                },
            }
        )

        expect(approveContractResult.errors).toBeDefined()
        if (approveContractResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(approveContractResult.errors[0].extensions?.code).toBe(
            'FORBIDDEN'
        )
        expect(approveContractResult.errors[0].message).toBe(
            'user not authorized to approve a contract'
        )
    })
})
