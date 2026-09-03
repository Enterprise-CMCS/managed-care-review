import { typedStatePrograms } from '@mc-review/submissions/src/statePrograms/StateCodeType.ts'
import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import {
    buildReviewContractFormData,
    buildReviewCreateContractInput,
    reviewSmokeMarker,
    reviewSmokeScenarioKey,
} from '../builders/reviewContract'
import {
    SyntheticCreateContractDocument,
    SyntheticFetchContractDocument,
    SyntheticSubmitContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
} from '../gen/gqlClient'
import { documentFixtures, loadDocumentFixture } from '../fixtures/documents'
import type { Logger } from '../logger'

export type ReviewSmokeResult = {
    scenarioKey: typeof reviewSmokeScenarioKey
    seed: string
    marker: string
    contractId: string
    status: 'SUBMITTED'
}

type ReviewSmokeOptions = {
    graphql: GraphQLClient
    uploads: UploadClient
    logger: Logger
    seed: string
}

export async function runReviewSmokeScenario({
    graphql,
    uploads,
    logger,
    seed,
}: ReviewSmokeOptions): Promise<ReviewSmokeResult> {
    const marker = reviewSmokeMarker(seed)
    logger.info('synthetic.review-smoke.started', {
        scenarioKey: reviewSmokeScenarioKey,
        seed,
    })

    const minnesotaProgram = typedStatePrograms.states
        .find((state) => state.code === 'MN')
        ?.programs.filter(
            (program) => !program.isDeprecated && !program.isRateProgram
        )
        .sort((left, right) => left.id.localeCompare(right.id))[0]
    if (!minnesotaProgram) {
        throw new Error(
            'Synthetic review scenario requires an active Minnesota contract program'
        )
    }
    const programId = minnesotaProgram.id

    const createResult = await graphql.execute(
        SyntheticCreateContractDocument,
        {
            input: buildReviewCreateContractInput(seed, programId),
        }
    )
    const contract = createResult.createContract.contract
    const lastSeenUpdatedAt = contract.draftRevision?.updatedAt
    if (!lastSeenUpdatedAt || contract.status !== 'DRAFT') {
        throw new Error('Synthetic contract was not created as a draft')
    }

    logger.info('synthetic.review-smoke.contract-created', {
        contractId: contract.id,
    })

    const fixture = documentFixtures.pdf.small
    const uploadedDocument = await uploads.upload({
        name: `synthetic-review-${seed}.pdf`,
        bytes: await loadDocumentFixture(fixture),
        fileType: fixture.fileType,
        bucketName: 'HEALTH_PLAN_DOCS',
        contentType: fixture.contentType,
    })

    const updateResult = await graphql.execute(
        SyntheticUpdateContractDraftRevisionDocument,
        {
            input: {
                contractID: contract.id,
                lastSeenUpdatedAt,
                formData: buildReviewContractFormData(
                    seed,
                    programId,
                    uploadedDocument
                ),
            },
        }
    )
    if (
        updateResult.updateContractDraftRevision.contract.id !== contract.id ||
        !updateResult.updateContractDraftRevision.contract.draftRevision
    ) {
        throw new Error('Synthetic contract draft update was not persisted')
    }

    const submitResult = await graphql.execute(
        SyntheticSubmitContractDocument,
        {
            input: { contractID: contract.id },
        }
    )
    if (
        submitResult.submitContract.contract.id !== contract.id ||
        submitResult.submitContract.contract.status !== 'SUBMITTED'
    ) {
        throw new Error('Synthetic contract was not submitted')
    }

    const fetchResult = await graphql.execute(SyntheticFetchContractDocument, {
        input: { contractID: contract.id },
    })
    const fetchedContract = fetchResult.fetchContract.contract
    const markerWasPersisted = fetchedContract.packageSubmissions.some(
        (submission) =>
            submission.contractRevision.formData.submissionDescription ===
            marker
    )
    if (
        fetchedContract.id !== contract.id ||
        fetchedContract.stateCode !== 'MN' ||
        fetchedContract.status !== 'SUBMITTED' ||
        !markerWasPersisted
    ) {
        throw new Error('Synthetic contract verification failed')
    }

    const result: ReviewSmokeResult = {
        scenarioKey: reviewSmokeScenarioKey,
        seed,
        marker,
        contractId: contract.id,
        status: 'SUBMITTED',
    }
    logger.info('synthetic.review-smoke.completed', result)
    return result
}
