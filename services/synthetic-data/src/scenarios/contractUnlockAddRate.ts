import {
    buildContractWithAddedRateFormData,
    contractAddRateResubmitReason,
    contractUnlockAddRateMarker,
    contractUnlockAddRateReason,
    contractUnlockAddRateScenarioKey,
} from '../builders/contractUnlockAddRate'
import { buildSyntheticRateFormData } from '../builders/rate'
import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import {
    SyntheticSubmitContractDocument,
    SyntheticUnlockContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
    SyntheticUpdateDraftContractRatesDocument,
} from '../gen/gqlClient'
import { documentFixtures, loadDocumentFixture } from '../fixtures/documents'
import type { Logger } from '../logger'
import { submitSyntheticContract } from './submitContract'

export type ContractUnlockAddRateResult = {
    scenarioKey: typeof contractUnlockAddRateScenarioKey
    seed: string
    initialMarker: string
    resubmittedMarker: string
    contractId: string
    rateId: string
    status: 'RESUBMITTED'
    submissionCount: 2
}

type ContractUnlockAddRateOptions = {
    stateGraphql: GraphQLClient
    cmsGraphql: GraphQLClient
    uploads: UploadClient
    logger: Logger
    seed: string
}

/**
 * Creates a contract-only submission, unlocks it, adds its first owned rate, and
 * resubmits it through the public API.
 */
export async function runContractUnlockAddRateScenario({
    stateGraphql,
    cmsGraphql,
    uploads,
    logger,
    seed,
}: ContractUnlockAddRateOptions): Promise<ContractUnlockAddRateResult> {
    const initialMarker = contractUnlockAddRateMarker(seed, 'initial')
    const resubmittedMarker = contractUnlockAddRateMarker(seed, 'resubmitted')
    logger.info('synthetic.contract-unlock-add-rate.started', {
        scenarioKey: contractUnlockAddRateScenarioKey,
        seed,
    })

    const { contractId, programId, contractDocument } =
        await submitSyntheticContract({
            graphql: stateGraphql,
            uploads,
            marker: initialMarker,
            documentName: `synthetic-contract-unlock-add-rate-${seed}-initial.pdf`,
        })

    const unlockResult = await cmsGraphql.execute(
        SyntheticUnlockContractDocument,
        {
            input: {
                contractID: contractId,
                unlockedReason: contractUnlockAddRateReason,
            },
        }
    )
    const unlockedContract = unlockResult.unlockContract.contract
    const unlockedRevision = unlockedContract.draftRevision
    if (unlockedContract.id !== contractId || !unlockedRevision?.updatedAt) {
        throw new Error(
            'Synthetic unlock response did not contain the expected draft'
        )
    }

    const rateFixture = documentFixtures.pdf.small
    const rateDocument = await uploads.upload({
        name: `synthetic-contract-unlock-add-rate-${seed}-rate.pdf`,
        bytes: await loadDocumentFixture(rateFixture),
        fileType: rateFixture.fileType,
        bucketName: 'HEALTH_PLAN_DOCS',
        contentType: rateFixture.contentType,
    })
    const contractUpdate = await stateGraphql.execute(
        SyntheticUpdateContractDraftRevisionDocument,
        {
            input: {
                contractID: contractId,
                lastSeenUpdatedAt: unlockedRevision.updatedAt,
                formData: buildContractWithAddedRateFormData(
                    seed,
                    programId,
                    contractDocument
                ),
            },
        }
    )
    const updatedDraft =
        contractUpdate.updateContractDraftRevision.contract.draftRevision
    if (
        contractUpdate.updateContractDraftRevision.contract.id !== contractId ||
        !updatedDraft?.updatedAt
    ) {
        throw new Error(
            'Synthetic update response did not contain the expected draft'
        )
    }

    // Rate reconciliation requires the complete intended rate set and the timestamp
    // returned by the preceding contract update for optimistic concurrency control.
    const rateUpdate = await stateGraphql.execute(
        SyntheticUpdateDraftContractRatesDocument,
        {
            input: {
                contractID: contractId,
                lastSeenUpdatedAt: updatedDraft.updatedAt,
                updatedRates: [
                    {
                        type: 'CREATE',
                        formData: buildSyntheticRateFormData(
                            programId,
                            rateDocument
                        ),
                    },
                ],
            },
        }
    )
    const draftRates =
        rateUpdate.updateDraftContractRates.contract.draftRates ?? []
    const rateId = draftRates[0]?.id
    if (
        rateUpdate.updateDraftContractRates.contract.id !== contractId ||
        !rateId ||
        draftRates.length !== 1
    ) {
        throw new Error(
            'Synthetic rate update response did not contain the expected rate ID'
        )
    }

    const resubmitResult = await stateGraphql.execute(
        SyntheticSubmitContractDocument,
        {
            input: {
                contractID: contractId,
                submittedReason: contractAddRateResubmitReason,
            },
        }
    )
    if (resubmitResult.submitContract.contract.id !== contractId) {
        throw new Error(
            'Synthetic submit response did not identify the expected contract'
        )
    }

    const result: ContractUnlockAddRateResult = {
        scenarioKey: contractUnlockAddRateScenarioKey,
        seed,
        initialMarker,
        resubmittedMarker,
        contractId,
        rateId,
        status: 'RESUBMITTED',
        submissionCount: 2,
    }
    logger.info('synthetic.contract-unlock-add-rate.completed', result)
    return result
}
