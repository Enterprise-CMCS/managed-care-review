import {
    Resolver,
    ResolverTypeWrapper,
    CreateDraftSubmissionInput,
    CreateDraftSubmissionPayload,
} from '../gen/gqlServer'

// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export const createDraftSubmissionResolver: Resolver<
    ResolverTypeWrapper<CreateDraftSubmissionPayload>,
    {},
    any,
    { input: CreateDraftSubmissionInput }
> = async (_parent, { input }) => {
    // Query the database and validate program id is valid
    const isValidProgram = (id: string) => id === 'abc123'

    if (!isValidProgram(input.programId))
        throw new Error('program id is not valid')

    const programFromDatabase = {
        id: 'abc123',
        name: 'California',
    }

    return {
        draftSubmission: {
            id: 'fake-submission-id',
            name: 'fake-name-123',
            program: programFromDatabase,
            submissionType: input.submissionType,
            submissionDescription: input.submissionDescription,
        },
    }
}
