import {
    InsertDraftSubmissionArgsType,
    isStoreError,
    Store
} from '../store/index'

import {
    Resolver,
    ResolverTypeWrapper,
    CreateDraftSubmissionInput,
    CreateDraftSubmissionPayload,
    SubmissionType
} from '../gen/gqlServer'

// TODO: check that program Id is valid in resolver by looking up stateCode from statePrograms
// TODO: if id is valid, pull stateCode
// potential refactor: pull out database interactions into /datasources createDraftSubmission as per apollo server docs

export function createDraftSubmissionResolver(
    store: Store
): Resolver<
    ResolverTypeWrapper<CreateDraftSubmissionPayload>,
    Record<string, unknown>,
    any, // eslint-disable-line  @typescript-eslint/no-explicit-any
    { input: CreateDraftSubmissionInput }
> { 
    return async (_parent, { input}) => {
      const dbDraftSubmission: InsertDraftSubmissionArgsType = {
            stateCode: 'MN',
            programID: input.programId,
            submissionDescription: input.submissionDescription,
            submissionType: input.submissionType as InsertDraftSubmissionArgsType['submissionType']
        }

   
        try {
            const draftSubResult = await store.insertDraftSubmission(
               dbDraftSubmission
            )

            console.log(draftSubResult)

            if (isStoreError(draftSubResult)) {
                throw new Error(`Issue creating a draft submission of type ${draftSubResult.code}. Message: ${draftSubResult.message}`)
            } else {
                // Add a program from graphql resolver, probably remove programID if it was present
                const program = {
                    id: 'abc123',
                    name: 'California',
                }
  
                    return { draftSubmission: {
                        id: draftSubResult.id,
                        createdAt: draftSubResult.createdAt,
                        submissionDescription: draftSubResult.submissionType,
                        name: 'SOME_NAME',
                        submissionType: draftSubResult.submissionType as SubmissionType,
                        program
                    }
                       
                    }
                
            }
     
        } catch (createErr) {
            console.log('Error creating a draft submission:', createErr)
            throw new Error(createErr)
        }}

}
