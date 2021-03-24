import {
    InsertDraftSubmissionArgsType,
    isStoreError,
    Store,
} from '../store/index'

import statePrograms from '../data/statePrograms.json'
import {
    Resolver,
    ResolverTypeWrapper,
    CreateDraftSubmissionInput,
    CreateDraftSubmissionPayload,
    SubmissionType,
} from '../gen/gqlServer'

// TODO: potential refactor: pull out database interactions into /datasources createDraftSubmission as per apollo server docs
export function createDraftSubmissionResolver(
    store: Store
): Resolver<
    ResolverTypeWrapper<CreateDraftSubmissionPayload>,
    Record<string, unknown>,
    any, // eslint-disable-line  @typescript-eslint/no-explicit-any
    { input: CreateDraftSubmissionInput }
> {
    return async (_parent, { input }) => {
        const stateFromCurrentUser = statePrograms.states[0]
        const program = stateFromCurrentUser.programs.find(
            (program) => program.id == input.programId
        )

        if (program === undefined) {
            throw new Error(
                `The program id ${input.programId} does not exist in state ${stateFromCurrentUser.name}`
            )
        }

        const dbDraftSubmission: InsertDraftSubmissionArgsType = {
            stateCode: stateFromCurrentUser.code,
            programID: input.programId,
            submissionDescription: input.submissionDescription,
            submissionType: input.submissionType as InsertDraftSubmissionArgsType['submissionType'],
        }

        try {
            const draftSubResult = await store.insertDraftSubmission(
                dbDraftSubmission
            )
            if (isStoreError(draftSubResult)) {
                throw new Error(
                    `Issue creating a draft submission of type ${draftSubResult.code}. Message: ${draftSubResult.message}`
                )
            } else {
                const draftSubmission = {
                    id: draftSubResult.id,
                    createdAt: draftSubResult.createdAt,
                    submissionDescription: draftSubResult.submissionDescription,
                    name: `${draftSubResult.stateCode}-${program.name}-${draftSubResult.stateNumber}`,
                    submissionType: draftSubResult.submissionType as SubmissionType,
                    program,
                }
                return {
                    draftSubmission,
                }
            }
        } catch (createErr) {
            console.log('Error creating a draft submission:', createErr)
            throw new Error(createErr)
        }
    }
}
