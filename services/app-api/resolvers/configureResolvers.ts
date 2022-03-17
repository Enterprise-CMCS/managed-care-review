import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'
import type { Emailer } from '../emailer'
import { Resolvers } from '../gen/gqlServer'
import type { Store } from '../postgres'
import { createDraftSubmissionResolver } from './createDraftSubmission'
import { draftSubmissionResolver } from './draftSubmissionResolver'
import { fetchCurrentUserResolver } from './fetchCurrentUser'
import { fetchDraftSubmissionResolver } from './fetchDraftSubmission'
import { fetchStateSubmissionResolver } from './fetchStateSubmission'
import { fetchSubmission2Resolver } from './fetchSubmission2'
import { indexSubmissionsResolver } from './indexSubmissions'
import { indexSubmissions2Resolver } from './indexSubmissions2'
import { stateSubmissionResolver } from './stateSubmissionResolver'
import { submission2Resolver } from './submission2Resolver'
import { submitDraftSubmissionResolver } from './submitDraftSubmission'
import { unlockStateSubmissionResolver } from './unlockStateSubmission'
import { updateDraftSubmissionResolver } from './updateDraftSubmission'
import { stateUserResolver } from './userResolver'

export function configureResolvers(store: Store, emailer: Emailer): Resolvers {
    const resolvers: Resolvers = {
        Date: GraphQLDate,
        DateTime: GraphQLDateTime,
        Query: {
            fetchCurrentUser: fetchCurrentUserResolver(),
            fetchDraftSubmission: fetchDraftSubmissionResolver(store),
            fetchStateSubmission: fetchStateSubmissionResolver(store),
            fetchSubmission2: fetchSubmission2Resolver(store),
            indexSubmissions: indexSubmissionsResolver(store),
            indexSubmissions2: indexSubmissions2Resolver(store)
        },
        Mutation: {
            createDraftSubmission: createDraftSubmissionResolver(store),
            updateDraftSubmission: updateDraftSubmissionResolver(store),
            submitDraftSubmission: submitDraftSubmissionResolver(
                store,
                emailer
            ),
            unlockStateSubmission: unlockStateSubmissionResolver(store, emailer),
        },
        Submission: {
            // resolveType is required to differentiate Unions
            __resolveType(obj) {
                if ('submittedAt' in obj) {
                    return 'StateSubmission'
                } else {
                    return 'DraftSubmission'
                }
            },
        },
        User: {
            // resolveType is required to differentiate Unions
            __resolveType(obj) {
                if (obj.role === 'STATE_USER') {
                    return 'StateUser'
                } else {
                    return 'CMSUser'
                }
            },
        },
        StateUser: stateUserResolver,
        Submission2: submission2Resolver,
        DraftSubmission: draftSubmissionResolver(store),
        StateSubmission: stateSubmissionResolver(store),
    }

    return resolvers
}
