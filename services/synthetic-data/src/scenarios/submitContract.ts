import { typedStatePrograms } from '@mc-review/submissions/src/statePrograms/StateCodeType.ts'
import type { UploadedDocument, UploadClient } from '../client/uploadClient'
import type { GraphQLClient } from '../client/graphqlClient'
import {
    buildSyntheticContractCreateInput,
    buildSyntheticContractFormData,
} from '../builders/contractSmoke'
import { buildSyntheticRateFormData } from '../builders/rate'
import {
    SyntheticCreateContractDocument,
    SyntheticSubmitContractDocument,
    SyntheticUpdateContractDraftRevisionDocument,
    SyntheticUpdateDraftContractRatesDocument,
    type UpdateContractRateInput,
} from '../gen/gqlClient'
import { documentFixtures, loadDocumentFixture } from '../fixtures/documents'

export type SubmittedSyntheticContract = {
    contractId: string
    programId: string
    contractDocument: UploadedDocument
    rateIds: string[]
}

export type SyntheticContractRate =
    { type: 'CREATE'; documentName: string } | { type: 'LINK'; rateId: string }

type SubmitSyntheticContractOptions = {
    graphql: GraphQLClient
    uploads: UploadClient
    marker: string
    documentName: string
    rates?: ReadonlyArray<SyntheticContractRate>
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

/**
 * Creates and submits one Minnesota contract through the public API.
 * When rates are supplied they are the contract's complete intended rate set:
 * CREATE entries request new rates and LINK entries reuse existing rate IDs.
 */
export async function submitSyntheticContract({
    graphql,
    uploads,
    marker,
    documentName,
    rates = [],
}: SubmitSyntheticContractOptions): Promise<SubmittedSyntheticContract> {
    const programId = minnesotaContractProgramId()
    const submissionType =
        rates.length === 0 ? 'CONTRACT_ONLY' : 'CONTRACT_AND_RATES'
    const createResult = await graphql.execute(
        SyntheticCreateContractDocument,
        {
            input: {
                ...buildSyntheticContractCreateInput(marker, programId),
                submissionType,
            },
        }
    )
    const contract = createResult.createContract.contract
    const lastSeenUpdatedAt = contract.draftRevision?.updatedAt
    if (!contract.id || !lastSeenUpdatedAt) {
        throw new Error(
            'Synthetic create response did not contain a contract ID and draft timestamp'
        )
    }

    const fixture = documentFixtures.pdf.small
    const contractDocument = await uploads.upload({
        name: documentName,
        bytes: await loadDocumentFixture(fixture),
        fileType: fixture.fileType,
        bucketName: 'HEALTH_PLAN_DOCS',
        contentType: fixture.contentType,
    })
    const updatedRates: UpdateContractRateInput[] = await Promise.all(
        rates.map(async (rate): Promise<UpdateContractRateInput> => {
            if (rate.type === 'LINK') {
                return { type: 'LINK', rateID: rate.rateId }
            }

            const rateDocument = await uploads.upload({
                name: rate.documentName,
                bytes: await loadDocumentFixture(fixture),
                fileType: fixture.fileType,
                bucketName: 'HEALTH_PLAN_DOCS',
                contentType: fixture.contentType,
            })
            return {
                type: 'CREATE',
                formData: buildSyntheticRateFormData(programId, rateDocument),
            }
        })
    )

    const updateResult = await graphql.execute(
        SyntheticUpdateContractDraftRevisionDocument,
        {
            input: {
                contractID: contract.id,
                lastSeenUpdatedAt,
                formData: {
                    ...buildSyntheticContractFormData(
                        marker,
                        programId,
                        contractDocument
                    ),
                    submissionType,
                },
            },
        }
    )
    const updatedDraft =
        updateResult.updateContractDraftRevision.contract.draftRevision
    if (
        updateResult.updateContractDraftRevision.contract.id !== contract.id ||
        !updatedDraft?.updatedAt
    ) {
        throw new Error(
            'Synthetic update response did not contain the expected draft'
        )
    }

    let rateIds: string[] = []
    if (updatedRates.length > 0) {
        const rateResult = await graphql.execute(
            SyntheticUpdateDraftContractRatesDocument,
            {
                input: {
                    contractID: contract.id,
                    lastSeenUpdatedAt: updatedDraft.updatedAt,
                    updatedRates,
                },
            }
        )
        const draftRates =
            rateResult.updateDraftContractRates.contract.draftRates ?? []
        rateIds = draftRates.map((rate) => rate.id)
        const expectedLinkedRateIds = rates
            .filter(
                (
                    rate
                ): rate is Extract<SyntheticContractRate, { type: 'LINK' }> =>
                    rate.type === 'LINK'
            )
            .map((rate) => rate.rateId)
        if (
            rateResult.updateDraftContractRates.contract.id !== contract.id ||
            draftRates.length !== rates.length ||
            rateIds.some((rateId) => !rateId) ||
            expectedLinkedRateIds.some((rateId) => !rateIds.includes(rateId))
        ) {
            throw new Error(
                'Synthetic rate update response did not contain the expected rate IDs'
            )
        }
    }

    const submitResult = await graphql.execute(
        SyntheticSubmitContractDocument,
        {
            input: { contractID: contract.id },
        }
    )
    if (submitResult.submitContract.contract.id !== contract.id) {
        throw new Error(
            'Synthetic submit response did not identify the expected contract'
        )
    }

    return { contractId: contract.id, programId, contractDocument, rateIds }
}
