import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import {
    contractSmokeMarker,
    contractSmokeScenarioKey,
} from '../builders/contractSmoke'
import { SyntheticFetchContractDocument } from '../gen/gqlClient'
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

    // Read the submitted package back to verify persistence, not only the mutation response.
    const fetchResult = await graphql.execute(SyntheticFetchContractDocument, {
        input: { contractID: contractId },
    })
    const fetchedContract = fetchResult.fetchContract.contract
    const markerWasPersisted = fetchedContract.packageSubmissions.some(
        (submission) =>
            submission.contractRevision.formData.submissionDescription ===
            marker
    )
    if (
        fetchedContract.id !== contractId ||
        fetchedContract.stateCode !== 'MN' ||
        fetchedContract.status !== 'SUBMITTED' ||
        !markerWasPersisted
    ) {
        throw new Error('Synthetic contract verification failed')
    }

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
