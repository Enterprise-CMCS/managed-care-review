import {
    contractLinkedRateMarker,
    contractLinkedRateScenarioKey,
} from '../builders/contractLinkedRate'
import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import { SyntheticFetchContractDocument } from '../gen/gqlClient'
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
 * Creates one submitted parent rate, links it to a second submitted contract, and
 * reads both packages back to prove that linking did not change rate ownership.
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

    // Linking reuses the submitted rate revision; the target contract must not become its parent.
    const linked = await submitSyntheticContract({
        graphql,
        uploads,
        marker,
        documentName: `synthetic-linked-rate-target-contract-${seed}.pdf`,
        rates: [{ type: 'LINK', rateId }],
    })

    const [sourceFetch, linkedFetch] = await Promise.all([
        graphql.execute(SyntheticFetchContractDocument, {
            input: { contractID: source.contractId },
        }),
        graphql.execute(SyntheticFetchContractDocument, {
            input: { contractID: linked.contractId },
        }),
    ])
    const sourceContract = sourceFetch.fetchContract.contract
    const linkedContract = linkedFetch.fetchContract.contract
    const sourceSubmission = sourceContract.packageSubmissions.find(
        (submission) =>
            submission.contractRevision.formData.submissionDescription ===
            sourceMarker
    )
    const linkedSubmission = linkedContract.packageSubmissions.find(
        (submission) =>
            submission.contractRevision.formData.submissionDescription ===
            marker
    )
    const sourceRate = sourceSubmission?.rateRevisions.find(
        (revision) => revision.rateID === rateId
    )
    const linkedRate = linkedSubmission?.rateRevisions.find(
        (revision) => revision.rateID === rateId
    )

    if (
        sourceContract.status !== 'SUBMITTED' ||
        linkedContract.status !== 'SUBMITTED' ||
        sourceRate?.rate?.parentContractID !== source.contractId ||
        linkedRate?.rate?.parentContractID !== source.contractId ||
        linked.contractId === source.contractId
    ) {
        throw new Error('Synthetic linked-rate topology verification failed')
    }

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
