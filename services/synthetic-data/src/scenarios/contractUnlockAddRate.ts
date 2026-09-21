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
    SyntheticFetchContractDocument,
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
 * resubmits it. The final read verifies both package snapshots and rate ownership.
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
    if (
        unlockedContract.id !== contractId ||
        unlockedContract.status !== 'UNLOCKED' ||
        !unlockedRevision ||
        unlockedRevision.unlockInfo?.updatedReason !==
            contractUnlockAddRateReason ||
        unlockedRevision.unlockInfo.updatedBy.role !== 'CMS_USER'
    ) {
        throw new Error('Synthetic contract unlock verification failed')
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
        !updatedDraft
    ) {
        throw new Error('Synthetic unlocked contract update was not persisted')
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
        !rateId ||
        draftRates.length !== 1 ||
        draftRates[0]?.parentContractID !== contractId
    ) {
        throw new Error('Synthetic rate addition was not persisted')
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
    if (
        resubmitResult.submitContract.contract.id !== contractId ||
        resubmitResult.submitContract.contract.status !== 'RESUBMITTED'
    ) {
        throw new Error(
            'Synthetic contract with added rate was not resubmitted'
        )
    }

    const finalFetch = await stateGraphql.execute(
        SyntheticFetchContractDocument,
        { input: { contractID: contractId } }
    )
    const finalContract = finalFetch.fetchContract.contract
    const initialSubmission = finalContract.packageSubmissions.find(
        (submission) =>
            submission.contractRevision.formData.submissionDescription ===
            initialMarker
    )
    const resubmission = finalContract.packageSubmissions.find(
        (submission) =>
            submission.contractRevision.formData.submissionDescription ===
            resubmittedMarker
    )
    const submittedRate = resubmission?.rateRevisions.find(
        (revision) => revision.rateID === rateId
    )

    if (
        finalContract.id !== contractId ||
        finalContract.stateCode !== 'MN' ||
        finalContract.status !== 'RESUBMITTED' ||
        finalContract.draftRevision !== null ||
        finalContract.packageSubmissions.length !== 2 ||
        !initialSubmission ||
        initialSubmission.rateRevisions.length !== 0 ||
        !resubmission ||
        resubmission.submitInfo.updatedReason !==
            contractAddRateResubmitReason ||
        resubmission.contractRevision.unlockInfo?.updatedReason !==
            contractUnlockAddRateReason ||
        submittedRate?.rate?.parentContractID !== contractId
    ) {
        throw new Error(
            'Synthetic add-rate resubmission history verification failed'
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
