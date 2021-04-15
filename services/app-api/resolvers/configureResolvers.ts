import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'

import type { Store } from '../store'
import { Resolvers } from '../gen/gqlServer'

import { fetchCurrentUserResolver } from './fetchCurrentUser'
import { userResolver } from './userResolver'
import { fetchDraftSubmissionResolver } from './fetchDraftSubmission'
import { createDraftSubmissionResolver } from './createDraftSubmission'
import { updateDraftSubmissionResolver } from './updateDraftSubmission'
import { draftSubmissionResolver } from './draftSubmissionResolver'

export function configureResolvers(store: Store): Resolvers {
    const resolvers: Resolvers = {
        Date: GraphQLDate,
        DateTime: GraphQLDateTime,
        Query: {
            fetchCurrentUser: fetchCurrentUserResolver(),
            fetchDraftSubmission: fetchDraftSubmissionResolver(store),
        },
        Mutation: {
            createDraftSubmission: createDraftSubmissionResolver(store),
            updateDraftSubmission: updateDraftSubmissionResolver(store),
        },
        User: userResolver,
        DraftSubmission: draftSubmissionResolver(store),
    }

    return resolvers
}
