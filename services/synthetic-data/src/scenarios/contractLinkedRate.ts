import {
    contractLinkedRateMarker,
    contractLinkedRateScenarioKey,
} from '../builders/contractLinkedRate'
import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import type { Logger } from '../logger'
import { submitSyntheticContract } from './submitContract'

export type ContractLinkedRateResult = {
    scenarioKey: typeof contractLinkedRateScenarioKey
    seed: string
    marker: string
    sourceMarker: string
    contractId: string
    sourceContractId: string
    rateId: string
    status: 'SUBMITTED'
}

type ContractLinkedRateOptions = {
    graphql: GraphQLClient
    uploads: UploadClient
    logger: Logger
    seed: string
}

/**
 * Creates one submitted source rate and links it to a second submitted contract.
 */
export async function runContractLinkedRateScenario({
    graphql,
    uploads,
    logger,
    seed,
}: ContractLinkedRateOptions): Promise<ContractLinkedRateResult> {
    const sourceMarker = contractLinkedRateMarker(seed, 'source')
    const marker = contractLinkedRateMarker(seed, 'linked')
    logger.info('synthetic.contract-linked-rate.started', {
        scenarioKey: contractLinkedRateScenarioKey,
        seed,
    })

    // The rate must be submitted with its source contract before the API permits linking.
    const source = await submitSyntheticContract({
        graphql,
        uploads,
        marker: sourceMarker,
        documentName: `synthetic-linked-rate-source-contract-${seed}.pdf`,
        rates: [
            {
                type: 'CREATE',
                documentName: `synthetic-linked-rate-source-rate-${seed}.pdf`,
            },
        ],
    })
    const rateId = source.rateIds[0]
    if (!rateId || source.rateIds.length !== 1) {
        throw new Error('Synthetic source contract did not create one rate')
    }

    // Reuse the rate ID returned by the source submission.
    const linked = await submitSyntheticContract({
        graphql,
        uploads,
        marker,
        documentName: `synthetic-linked-rate-target-contract-${seed}.pdf`,
        rates: [{ type: 'LINK', rateId }],
    })

    const result: ContractLinkedRateResult = {
        scenarioKey: contractLinkedRateScenarioKey,
        seed,
        marker,
        sourceMarker,
        contractId: linked.contractId,
        sourceContractId: source.contractId,
        rateId,
        status: 'SUBMITTED',
    }
    logger.info('synthetic.contract-linked-rate.completed', result)
    return result
}
