import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import {
    buildResubmittedContractFormData,
    contractResubmitReason,
    contractUnlockReason,
    contractUnlockResubmitMarker,
    contractUnlockResubmitScenarioKey,
} from '../builders/contractUnlockResubmit'
import {
    SyntheticSubmitContractDocument,
    SyntheticUnlockContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
} from '../gen/gqlClient'
import { documentFixtures, loadDocumentFixture } from '../fixtures/documents'
import type { Logger } from '../logger'
import { submitSyntheticContract } from './submitContract'

export type ContractUnlockResubmitResult = {
    scenarioKey: typeof contractUnlockResubmitScenarioKey
    seed: string
    initialMarker: string
    resubmittedMarker: string
    contractId: string
    status: 'RESUBMITTED'
    submissionCount: 2
}

type ContractUnlockResubmitOptions = {
    stateGraphql: GraphQLClient
    cmsGraphql: GraphQLClient
    uploads: UploadClient
    logger: Logger
    seed: string
}

export async function runContractUnlockResubmitScenario({
    stateGraphql,
    cmsGraphql,
    uploads,
    logger,
    seed,
}: ContractUnlockResubmitOptions): Promise<ContractUnlockResubmitResult> {
    const initialMarker = contractUnlockResubmitMarker(seed, 'initial')
    const resubmittedMarker = contractUnlockResubmitMarker(seed, 'resubmitted')
    logger.info('synthetic.contract-unlock-resubmit.started', {
        scenarioKey: contractUnlockResubmitScenarioKey,
        seed,
    })
    const { contractId, programId, contractDocument } =
        await submitSyntheticContract({
            graphql: stateGraphql,
            uploads,
            marker: initialMarker,
            documentName: `synthetic-contract-unlock-resubmit-${seed}-initial.pdf`,
        })
    const unlockResult = await cmsGraphql.execute(
        SyntheticUnlockContractDocument,
        {
            input: {
                contractID: contractId,
                unlockedReason: contractUnlockReason,
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

    const supportingFixture = documentFixtures.docx.small
    const supportingDocument = await uploads.upload({
        name: `synthetic-contract-unlock-resubmit-${seed}-revised.docx`,
        bytes: await loadDocumentFixture(supportingFixture),
        fileType: supportingFixture.fileType,
        bucketName: 'HEALTH_PLAN_DOCS',
        contentType: supportingFixture.contentType,
    })
    const updateResult = await stateGraphql.execute(
        SyntheticUpdateContractDraftRevisionDocument,
        {
            input: {
                contractID: contractId,
                lastSeenUpdatedAt: unlockedRevision.updatedAt,
                formData: buildResubmittedContractFormData(
                    seed,
                    programId,
                    contractDocument,
                    supportingDocument
                ),
            },
        }
    )
    if (
        updateResult.updateContractDraftRevision.contract.id !== contractId ||
        !updateResult.updateContractDraftRevision.contract.draftRevision
    ) {
        throw new Error(
            'Synthetic update response did not contain the expected draft'
        )
    }

    const resubmitResult = await stateGraphql.execute(
        SyntheticSubmitContractDocument,
        {
            input: {
                contractID: contractId,
                submittedReason: contractResubmitReason,
            },
        }
    )
    if (resubmitResult.submitContract.contract.id !== contractId) {
        throw new Error(
            'Synthetic submit response did not identify the expected contract'
        )
    }

    const result: ContractUnlockResubmitResult = {
        scenarioKey: contractUnlockResubmitScenarioKey,
        seed,
        initialMarker,
        resubmittedMarker,
        contractId,
        status: 'RESUBMITTED',
        submissionCount: 2,
    }
    logger.info('synthetic.contract-unlock-resubmit.completed', result)
    return result
}
