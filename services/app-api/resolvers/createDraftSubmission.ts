import {
    Resolver,
    ResolverTypeWrapper,
    CreateDraftSubmissionInput,
    CreateDraftSubmissionPayload,
} from '../gen/gqlServer'

export const createDraftSubmissionResolver: Resolver<
    ResolverTypeWrapper<CreateDraftSubmissionPayload>,
    Record<string, unknown>,
    any, // eslint-disable-line  @typescript-eslint/no-explicit-any
    { input: CreateDraftSubmissionInput }
> = async (_parent, { input }) => {
    // Query the database and validate program id is valid
    const isValidProgram = (id: string) => id === 'abc123'

    if (!isValidProgram(input.programId))
        throw new Error('program id is not valid')

    // Add draft submission to database and return draft submission.
    const draftSubmissionFromDatabase = {
        id: 'fake-submission-id',
        name: 'fake-name-123',
        submissionType: input.submissionType,
        submissionDescription: input.submissionDescription
    }
    // Add a program from graphql resolver, probably remove programID if it was present
    const programFromDatabase = {
        id: 'abc123',
        name: 'California',
    }

    return {
        draftSubmission: {
           ...draftSubmissionFromDatabase,
            program: programFromDatabase,
        },
    }
}
