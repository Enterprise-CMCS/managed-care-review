import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { ReverseApproveContractDocument } from '../../gen/gqlClient'
import { testCMSUser, testAdminUser } from '../../testHelpers/userHelpers'
import {
    approveTestContract,
    reverseApproveTestContract,
    createAndSubmitTestContract,
    createAndSubmitTestContractWithRate,
    unlockTestContract,
    resubmitTestContract,
    withdrawTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../testHelpers'

describe('reverseApproveContract', () => {
    const mockS3 = testS3Client()

    it('admin user can reverse an approved contract', async () => {
        const cmsServer = await constructTestPostgresServer({
            s3Client: mockS3,
            context: {
                user: testCMSUser(),
            },
        })

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

        await approveTestContract(cmsServer, contract.id)

        const reversedContract = await reverseApproveTestContract(
            adminServer,
            contract.id,
            'Approval was made in error'
        )

        expect(reversedContract.reviewStatus).toBe('UNDER_REVIEW')
        expect(reversedContract.reviewStatusActions![0].actionType).toBe(
            'UNDER_REVIEW'
        )
        expect(reversedContract.reviewStatusActions![0].updatedReason).toBe(
            'Approval was made in error'
        )
    })

    it('CMS user can reverse an approved contract', async () => {
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

        await approveTestContract(cmsServer, contract.id)

        const reversedContract = await reverseApproveTestContract(
            cmsServer,
            contract.id,
            'Reversing approval'
        )

        expect(reversedContract.reviewStatus).toBe('UNDER_REVIEW')
    })

    it('reversed approved contract can be unlocked and resubmitted', async () => {
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

        await approveTestContract(cmsServer, contract.id)

        const reversedContract = await reverseApproveTestContract(
            cmsServer,
            contract.id,
            'Approval was made in error'
        )

        expect(reversedContract.reviewStatus).toBe('UNDER_REVIEW')
        expect(reversedContract.consolidatedStatus).toBe('SUBMITTED')

        const unlockedContract = await unlockTestContract(
            cmsServer,
            contract.id,
            'Unlocking after reversed approval'
        )

        expect(unlockedContract.status).toBe('UNLOCKED')

        const resubmittedContract = await resubmitTestContract(
            stateServer,
            contract.id,
            'Resubmitting after unlock'
        )

        expect(resubmittedContract.status).toBe('RESUBMITTED')
        expect(resubmittedContract.consolidatedStatus).toBe('RESUBMITTED')

        const reapprovedContract = await approveTestContract(
            cmsServer,
            contract.id
        )

        expect(reapprovedContract.reviewStatus).toBe('APPROVED')
        expect(reapprovedContract.consolidatedStatus).toBe('APPROVED')
    })

    it('reversed approved contract can be withdrawn', async () => {
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

        await approveTestContract(cmsServer, contract.id)

        const reversedContract = await reverseApproveTestContract(
            cmsServer,
            contract.id,
            'Approval was made in error'
        )

        expect(reversedContract.consolidatedStatus).toBe('SUBMITTED')

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'Withdrawing after reversed approval'
        )

        expect(withdrawnContract.reviewStatus).toBe('WITHDRAWN')
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
    })

    it('errors if contract is not APPROVED', async () => {
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

        const result = await executeGraphQLOperation(cmsServer, {
            query: ReverseApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    updatedReason: 'Trying to reverse non-approved',
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(result.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(result.errors[0].message).toBe(
            'Attempted to reverse approval for contract with wrong status: SUBMITTED'
        )
    })

    it('errors if contract is in WITHDRAWN', async () => {
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

        await withdrawTestContract(cmsServer, contract.id, 'test unlock')

        const result = await executeGraphQLOperation(cmsServer, {
            query: ReverseApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    updatedReason: 'Trying to reverse draft',
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(result.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(result.errors[0].message).toBe(
            'Attempted to reverse approval for contract with wrong status: WITHDRAWN'
        )
    })

    it('errors if a state user calls it', async () => {
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

        await approveTestContract(cmsServer, contract.id)

        const result = await executeGraphQLOperation(stateServer, {
            query: ReverseApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    updatedReason: 'State user trying to reverse',
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(result.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(result.errors[0].message).toBe(
            'user not authorized to reverse approve a contract'
        )
    })

    it('errors when trying to reverse an already reversed contract', async () => {
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

        await approveTestContract(cmsServer, contract.id)

        await reverseApproveTestContract(
            cmsServer,
            contract.id,
            'First reversal'
        )

        const result = await executeGraphQLOperation(cmsServer, {
            query: ReverseApproveContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    updatedReason: 'Second reversal attempt',
                },
            },
        })

        expect(result.errors).toBeDefined()
        if (result.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(result.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(result.errors[0].message).toBe(
            'Attempted to reverse approval for contract with wrong status: SUBMITTED'
        )
    })
})
