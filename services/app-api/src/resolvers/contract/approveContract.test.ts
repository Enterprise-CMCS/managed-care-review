import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { ApproveContractDocument } from '../../gen/gqlClient'
import { testCMSUser } from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    createTestContract,
    createAndSubmitTestContract,
    unlockTestContract,
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

        const contract = await createAndSubmitTestContract(stateServer)

        const approvedContract = await approveTestContract(
            cmsServer,
            contract.id
        )
        expect(approvedContract.reviewStatusActions).toHaveLength(1)
        expect(approvedContract.reviewStatusActions![0]?.contractID).toBe(
            approvedContract.id
        )
        expect(approvedContract.reviewStatusActions![0]?.updatedReason).toBe('')
        expect(approvedContract.reviewStatusActions![0]?.actionType).toBe(
            'APPROVAL_NOTICE'
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

        const approveContractResult = await cmsServer.executeOperation({
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: draftContract.id,
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
            'Attempted to approve contract with wrong status'
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

        const contract = await createAndSubmitTestContract(stateServer)

        const unlockedContract = await unlockTestContract(
            cmsServer,
            contract.id,
            'unlock to resubmit'
        )

        const approveContractResult = await cmsServer.executeOperation({
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: unlockedContract.id,
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
            'Attempted to approve contract with wrong status'
        )
    })

    it('errors if contract review status is not UNDER_REVIEW', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

        const contract = await createAndSubmitTestContract(stateServer)

        await cmsServer.executeOperation({
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                },
            },
        })

        const secondApprovalResult = await cmsServer.executeOperation({
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
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
            'Attempted to approve contract with wrong status'
        )
    })

    it('errors if a non CMS/CMS Approver user calls it', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContract(stateServer)

        const approveContractResult = await stateServer.executeOperation({
            query: ApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                },
            },
        })

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
