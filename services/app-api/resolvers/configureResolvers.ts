import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'

import type { Store } from '../store'
import { Resolvers } from '../gen/gqlServer'

import { getCurrentUserResolver } from './currentUser'
import { userResolver } from './userResolver'
import { showDraftSubmissionResolver } from './showDraftSubmission'
import { createDraftSubmissionResolver } from './createDraftSubmission'
import { updateDraftSubmissionResolver } from './updateDraftSubmission'
import { draftSubmissionResolver } from './draftSubmissionResolver'

export function configureResolvers(store: Store): Resolvers {
    const resolvers: Resolvers = {
        Date: GraphQLDate,
        DateTime: GraphQLDateTime,
        Query: {
            getCurrentUser: getCurrentUserResolver(),
            showDraftSubmission: showDraftSubmissionResolver(store),
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
