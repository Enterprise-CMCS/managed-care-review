import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { ApproveContractDocument } from '../../gen/gqlClient'
import { testCMSUser } from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    createTestContract,
    unlockTestContract,
    createAndSubmitTestContractWithRate,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'

describe('approveContract', () => {
    const mockS3 = testS3Client()

    it('approves the contract', async () => {
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
        expect(approvedContract.reviewStatusActions).toHaveLength(1)
        expect(approvedContract.contractSubmissionType).toBe('HEALTH_PLAN')
        expect(approvedContract.reviewStatusActions![0]?.contractID).toBe(
            approvedContract.id
        )
        expect(
            approvedContract.reviewStatusActions![0]?.updatedReason
        ).toBeNull()
        expect(approvedContract.reviewStatusActions![0]?.actionType).toBe(
            'MARK_AS_APPROVED'
        )
        expect(approvedContract.reviewStatus).toBe('APPROVED')
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

    it('errors if a non CMS/CMS Approver user calls it', async () => {
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
