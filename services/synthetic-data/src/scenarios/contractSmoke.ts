import { typedStatePrograms } from '@mc-review/submissions/src/statePrograms/StateCodeType.ts'
import type { GraphQLClient } from '../client/graphqlClient'
import type { UploadClient } from '../client/uploadClient'
import {
    buildContractSmokeFormData,
    buildContractSmokeCreateContractInput,
    contractSmokeMarker,
    contractSmokeScenarioKey,
} from '../builders/contractSmoke'
import {
    SyntheticCreateContractDocument,
    SyntheticFetchContractDocument,
    SyntheticSubmitContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
} from '../gen/gqlClient'
import { documentFixtures, loadDocumentFixture } from '../fixtures/documents'
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

    const minnesotaProgram = typedStatePrograms.states
        .find((state) => state.code === 'MN')
        ?.programs.filter(
            (program) => !program.isDeprecated && !program.isRateProgram
        )
        .sort((left, right) => left.id.localeCompare(right.id))[0]
    if (!minnesotaProgram) {
        throw new Error(
            'Synthetic contract smoke scenario requires an active Minnesota contract program'
        )
    }
    const programId = minnesotaProgram.id

    const createResult = await graphql.execute(
        SyntheticCreateContractDocument,
        {
            input: buildContractSmokeCreateContractInput(seed, programId),
        }
    )
    const contract = createResult.createContract.contract
    const lastSeenUpdatedAt = contract.draftRevision?.updatedAt
    if (!lastSeenUpdatedAt || contract.status !== 'DRAFT') {
        throw new Error('Synthetic contract was not created as a draft')
    }

    logger.info('synthetic.contract-smoke.contract-created', {
        contractId: contract.id,
    })

    const fixture = documentFixtures.pdf.small
    const uploadedDocument = await uploads.upload({
        name: `synthetic-contract-smoke-${seed}.pdf`,
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
                formData: buildContractSmokeFormData(
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

    const result: ContractSmokeResult = {
        scenarioKey: contractSmokeScenarioKey,
        seed,
        marker,
        contractId: contract.id,
        status: 'SUBMITTED',
    }
    logger.info('synthetic.contract-smoke.completed', result)
    return result
}
