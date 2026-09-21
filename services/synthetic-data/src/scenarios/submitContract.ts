import { typedStatePrograms } from '@mc-review/submissions/src/statePrograms/StateCodeType.ts'
import type { UploadedDocument, UploadClient } from '../client/uploadClient'
import type { GraphQLClient } from '../client/graphqlClient'
import {
    buildSyntheticContractCreateInput,
    buildSyntheticContractFormData,
} from '../builders/contractSmoke'
import {
    SyntheticCreateContractDocument,
    SyntheticSubmitContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
} from '../gen/gqlClient'
import { documentFixtures, loadDocumentFixture } from '../fixtures/documents'

export type SubmittedSyntheticContract = {
    contractId: string
    programId: string
    contractDocument: UploadedDocument
}

type SubmitSyntheticContractOptions = {
    graphql: GraphQLClient
    uploads: UploadClient
    marker: string
    documentName: string
}

function minnesotaContractProgramId(): string {
    const program = typedStatePrograms.states
        .find((state) => state.code === 'MN')
        ?.programs.filter(
            (candidate) => !candidate.isDeprecated && !candidate.isRateProgram
        )
        .sort((left, right) => left.id.localeCompare(right.id))[0]
    if (!program) {
        throw new Error(
            'Synthetic contract scenario requires an active Minnesota contract program'
        )
    }
    return program.id
}

export async function submitSyntheticContract({
    graphql,
    uploads,
    marker,
    documentName,
}: SubmitSyntheticContractOptions): Promise<SubmittedSyntheticContract> {
    const programId = minnesotaContractProgramId()
    const createResult = await graphql.execute(
        SyntheticCreateContractDocument,
        {
            input: buildSyntheticContractCreateInput(marker, programId),
        }
    )
    const contract = createResult.createContract.contract
    const lastSeenUpdatedAt = contract.draftRevision?.updatedAt
    if (!lastSeenUpdatedAt || contract.status !== 'DRAFT') {
        throw new Error('Synthetic contract was not created as a draft')
    }

    const fixture = documentFixtures.pdf.small
    const contractDocument = await uploads.upload({
        name: documentName,
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
                formData: buildSyntheticContractFormData(
                    marker,
                    programId,
                    contractDocument
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

    return { contractId: contract.id, programId, contractDocument }
}
