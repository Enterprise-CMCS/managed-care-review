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
    SyntheticFetchContractDocument,
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
    const initialFetch = await stateGraphql.execute(
        SyntheticFetchContractDocument,
        { input: { contractID: contractId } }
    )
    const initialContract = initialFetch.fetchContract.contract
    if (
        initialContract.status !== 'SUBMITTED' ||
        !initialContract.initiallySubmittedAt
    ) {
        throw new Error(
            'Synthetic contract initial submission verification failed'
        )
    }

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
    if (
        unlockedContract.id !== contractId ||
        unlockedContract.status !== 'UNLOCKED' ||
        !unlockedRevision ||
        unlockedRevision.unlockInfo?.updatedReason !== contractUnlockReason ||
        unlockedRevision.unlockInfo.updatedBy.role !== 'CMS_USER'
    ) {
        throw new Error('Synthetic contract unlock verification failed')
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
        throw new Error('Synthetic unlocked contract update was not persisted')
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
    if (
        resubmitResult.submitContract.contract.id !== contractId ||
        resubmitResult.submitContract.contract.status !== 'RESUBMITTED'
    ) {
        throw new Error('Synthetic contract was not resubmitted')
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
    const initialDocument =
        initialSubmission?.contractRevision.formData.contractDocuments.find(
            (document) => document.sha256 === contractDocument.sha256
        )
    const retainedDocument =
        resubmission?.contractRevision.formData.contractDocuments.find(
            (document) => document.sha256 === contractDocument.sha256
        )
    const revisedSupportingDocument =
        resubmission?.contractRevision.formData.supportingDocuments.find(
            (document) => document.sha256 === supportingDocument.sha256
        )
    const initialHasRevisedSupportingDocument =
        initialSubmission?.contractRevision.formData.supportingDocuments.some(
            (document) => document.sha256 === supportingDocument.sha256
        ) ?? false

    if (
        finalContract.id !== contractId ||
        finalContract.stateCode !== 'MN' ||
        finalContract.status !== 'RESUBMITTED' ||
        finalContract.draftRevision !== null ||
        finalContract.initiallySubmittedAt !==
            initialContract.initiallySubmittedAt ||
        finalContract.packageSubmissions.length !== 2 ||
        !initialSubmission ||
        initialSubmission.submitInfo.updatedReason !== 'Initial submission' ||
        !resubmission ||
        resubmission.submitInfo.updatedReason !== contractResubmitReason ||
        resubmission.contractRevision.unlockInfo?.updatedReason !==
            contractUnlockReason ||
        resubmission.contractRevision.unlockInfo.updatedBy.role !==
            'CMS_USER' ||
        resubmission.contractRevision.formData.modifiedBenefitsProvided !==
            false ||
        resubmission.contractRevision.formData.modifiedGeoAreaServed !==
            false ||
        !initialDocument?.dateAdded ||
        retainedDocument?.dateAdded !== initialDocument.dateAdded ||
        !revisedSupportingDocument?.dateAdded ||
        initialHasRevisedSupportingDocument
    ) {
        throw new Error(
            'Synthetic contract resubmission history verification failed'
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
