import {
    InsertDraftSubmissionArgsType,
    isStoreError,
    Store,
} from '../store/index'

import statePrograms from '../data/statePrograms.json'
import {
    MutationResolvers,
    SubmissionType,
    State,
} from '../gen/gqlServer'

// TODO: potential refactor: pull out database interactions into /datasources createDraftSubmission as per apollo server docs
export function createDraftSubmissionResolver(
    store: Store
): MutationResolvers["createDraftSubmission"] {
    return async (_parent, { input }, context) => {
        const stateFromCurrentUser: State['code'] = context.user.state_code
        const program = statePrograms.states.find(state => state.code === stateFromCurrentUser)?.programs.find(
            (program) => program.id == input.programId
        )

        if (program === undefined) {
            throw new Error(
                `The program id ${input.programId} does not exist in state ${stateFromCurrentUser}`
            )
        }

        const dbDraftSubmission: InsertDraftSubmissionArgsType = {
            stateCode: stateFromCurrentUser,
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
                const padNumber = draftSubResult.stateNumber.toString().padStart(4, '0');
                const draftSubmission = {
                    id: draftSubResult.id,
                    createdAt: draftSubResult.createdAt,
                    submissionDescription: draftSubResult.submissionDescription,
                    name: `${draftSubResult.stateCode}-${program.name}-${padNumber}`,
                    submissionType: draftSubResult.submissionType as SubmissionType,
                    program,
                    stateCode: draftSubResult.stateCode
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
