import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { findLatestFlattenedContracts } from './findLatestFlattenedContracts'
import type { FlattenContractType } from '../../domain-models/flattenContractAndRateTypes/flattenContractTypes'

describe('findLatestFlattenedContracts', () => {
    it.skip('logs latest flattened contract data', async () => {
        const client = await sharedTestPrismaClient()

        const result = await findLatestFlattenedContracts(client)

        if (result instanceof Error) {
            console.error(
                'Error fetching latest flattened contracts:',
                result.message
            )
            throw result
        }

        console.info(
            'Latest flattened contracts:',
            JSON.stringify(result, null, 2)
        )
        console.info('Total contracts:', result.contracts.length)

        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
    })

    it.skip('finds the contract with the most documents', async () => {
        const client = await sharedTestPrismaClient()

        const result = await findLatestFlattenedContracts(client)

        if (result instanceof Error) {
            console.error(
                'Error fetching latest flattened contracts:',
                result.message
            )
            throw result
        }

        let maxDocCount = 0
        let contractWithMostDocs: FlattenContractType | undefined

        for (const contract of result.contracts) {
            const contractDocCount = contract.contractDocuments?.length ?? 0
            const contractSupportingDocCount =
                contract.supportingDocuments?.length ?? 0

            let rateDocCount = 0
            let rateSupportingDocCount = 0
            for (const rate of contract.rateRevisions) {
                rateDocCount += rate.rateDocuments?.length ?? 0
                rateSupportingDocCount += rate.supportingDocuments?.length ?? 0
            }

            const totalDocs =
                contractDocCount +
                contractSupportingDocCount +
                rateDocCount +
                rateSupportingDocCount

            if (totalDocs > maxDocCount) {
                maxDocCount = totalDocs
                contractWithMostDocs = contract
            }
        }

        if (contractWithMostDocs) {
            const c = contractWithMostDocs
            console.info('\n--- Contract with most documents ---')
            console.info('Contract ID:', c.contractId)
            console.info('Submission ID:', c.submissionID)
            console.info(
                'Contract documents:',
                c.contractDocuments?.length ?? 0
            )
            console.info(
                'Contract supporting documents:',
                c.supportingDocuments?.length ?? 0
            )

            let totalRateDocs = 0
            let totalRateSupportingDocs = 0
            for (const rate of c.rateRevisions) {
                totalRateDocs += rate.rateDocuments?.length ?? 0
                totalRateSupportingDocs += rate.supportingDocuments?.length ?? 0
            }
            console.info('Rate documents (total):', totalRateDocs)
            console.info(
                'Rate supporting documents (total):',
                totalRateSupportingDocs
            )
            console.info('Total documents:', maxDocCount)
            console.info('Number of rate revisions:', c.rateRevisions.length)

            // Per-rate breakdown to check for duplicates
            console.info('\n--- Per-rate breakdown ---')
            const rateIdsSeen = new Set<string>()
            for (const rate of c.rateRevisions) {
                const isDupe = rateIdsSeen.has(rate.rateRevisionId)
                rateIdsSeen.add(rate.rateRevisionId)
                console.info(
                    `  Rate ${rate.rateId} (rev ${rate.rateRevisionId})${isDupe ? ' [DUPLICATE]' : ''}:` +
                        ` rateDocs=${rate.rateDocuments?.length ?? 0}` +
                        ` supportingDocs=${rate.supportingDocuments?.length ?? 0}`
                )
            }
            if (rateIdsSeen.size !== c.rateRevisions.length) {
                console.info(
                    `\n⚠ Found duplicate rate revisions: ${c.rateRevisions.length} entries but only ${rateIdsSeen.size} unique`
                )
            }
        } else {
            console.info('No contracts found')
        }

        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
    })

    it('measures response size', async () => {
        const client = await sharedTestPrismaClient()

        const result = await findLatestFlattenedContracts(client)

        if (result instanceof Error) {
            console.error('Error:', result.message)
            throw result
        }

        const json = JSON.stringify(result)
        const sizeBytes = Buffer.byteLength(json, 'utf8')
        const sizeKB = (sizeBytes / 1024).toFixed(2)
        const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2)

        console.info('Total contracts:', result.contracts.length)
        console.info(
            `Response size: ${sizeBytes} bytes (${sizeKB} KB / ${sizeMB} MB)`
        )

        // Average per contract
        const avgBytes = (sizeBytes / result.contracts.length).toFixed(0)
        console.info(`Average per contract: ${avgBytes} bytes`)

        expect(result).toBeDefined()
    })
})
