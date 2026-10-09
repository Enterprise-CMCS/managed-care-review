import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import {
    contractSmokeMarker,
    contractSmokeScenarioKey,
} from '../builders/contractSmoke'
import { submitSyntheticContract } from './submitContract'
import type { Logger } from '../logger'

export type ContractSmokeResult = {
    scenarioKey: typeof contractSmokeScenarioKey
    seed: string
    marker: string
    contractId: string
    status: 'SUBMITTED'
}

type ContractSmokeOptions = {
    graphql: GraphQLClient
    uploads: UploadClient
    logger: Logger
    seed: string
}

export async function runContractSmokeScenario({
    graphql,
    uploads,
    logger,
    seed,
}: ContractSmokeOptions): Promise<ContractSmokeResult> {
    const marker = contractSmokeMarker(seed)
    logger.info('synthetic.contract-smoke.started', {
        scenarioKey: contractSmokeScenarioKey,
        seed,
    })

    const { contractId } = await submitSyntheticContract({
        graphql,
        uploads,
        marker,
        documentName: `synthetic-contract-smoke-${seed}.pdf`,
    })

    logger.info('synthetic.contract-smoke.contract-created', {
        contractId,
    })

    const result: ContractSmokeResult = {
        scenarioKey: contractSmokeScenarioKey,
        seed,
        marker,
        contractId,
        status: 'SUBMITTED',
    }
    logger.info('synthetic.contract-smoke.completed', result)
    return result
}
