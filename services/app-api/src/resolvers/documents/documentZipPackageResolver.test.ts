import { FetchContractDocument } from '../../gen/gqlClient'
import { createTestContract, testS3Client } from '../../testHelpers'
import {
    createAndSubmitTestContractWithRate,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { testStateUser } from '../../testHelpers/userHelpers'

describe('DocumentZipPackage resolver', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    it('returns downloadUrl for contract document zip packages', async () => {
        const stateUser = testStateUser()
        const stateServer = await constructTestPostgresServer({
            context: { user: stateUser },
            ldService,
            s3Client: mockS3,
        })

        // This creates a CONTRACT_AND_RATES submission with both contract and rate documents
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        const result = await stateServer.executeOperation({
            query: FetchContractDocument,
            variables: {
                input: { contractID: submittedContract.id },
            },
        })

        expect(result.errors).toBeUndefined()
        const contractRevision =
            result.data?.fetchContract.contract.packageSubmissions[0]
                .contractRevision

        // Contract documents should always have zip packages
        expect(contractRevision.documentZipPackages).toHaveLength(1)
        const zipPackage = contractRevision.documentZipPackages[0]

        expect(zipPackage).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                s3URL: expect.stringContaining('s3://'),
                sha256: expect.any(String),
                documentType: 'CONTRACT_DOCUMENTS',
                downloadUrl: expect.stringContaining('http'),
            })
        )
    })

    it('returns downloadUrl for rate document zip packages', async () => {
        const stateUser = testStateUser()
        const stateServer = await constructTestPostgresServer({
            context: { user: stateUser },
            ldService,
            s3Client: mockS3,
        })

        // This creates CONTRACT_AND_RATES with rates
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        const result = await stateServer.executeOperation({
            query: FetchContractDocument,
            variables: {
                input: { contractID: submittedContract.id },
            },
        })

        expect(result.errors).toBeUndefined()
        const rateRevisions =
            result.data?.fetchContract.contract.packageSubmissions[0]
                .rateRevisions

        // Should have rates and rate zip packages
        expect(rateRevisions).toHaveLength(1)
        expect(rateRevisions[0].documentZipPackages).toHaveLength(1)

        const rateZipPackage = rateRevisions[0].documentZipPackages[0]
        expect(rateZipPackage).toEqual(
            expect.objectContaining({
                id: expect.any(String),
                s3URL: expect.stringContaining('s3://'),
                sha256: expect.any(String),
                documentType: 'RATE_DOCUMENTS',
                downloadUrl: expect.stringContaining('http'),
            })
        )
    })

    it('handles CONTRACT_ONLY submissions without rate zip packages', async () => {
        const stateUser = testStateUser()
        const stateServer = await constructTestPostgresServer({
            context: { user: stateUser },
            ldService,
            s3Client: mockS3,
        })

        // Use createTestContract which creates CONTRACT_ONLY by default
        const contractOnly = await createTestContract(stateServer)
        const submittedContract = await submitTestContract(
            stateServer,
            contractOnly.id
        )

        const result = await stateServer.executeOperation({
            query: FetchContractDocument,
            variables: {
                input: { contractID: submittedContract.id },
            },
        })

        expect(result.errors).toBeUndefined()

        const contractRevision =
            result.data?.fetchContract.contract.packageSubmissions[0]
                .contractRevision
        const rateRevisions =
            result.data?.fetchContract.contract.packageSubmissions[0]
                .rateRevisions

        // Contract should have zip packages
        expect(contractRevision.documentZipPackages).toHaveLength(1)

        // Should have no rate revisions for CONTRACT_ONLY
        expect(rateRevisions).toHaveLength(0)
    })
})
