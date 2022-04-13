import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'
import type { Emailer } from '../emailer'
import { Resolvers } from '../gen/gqlServer'
import type { Store } from '../postgres'
import { createDraftSubmissionResolver } from './createDraftSubmission'
import { createHealthPlanPackageResolver } from './createHealthPlanPackage'
import { draftSubmissionResolver } from './draftSubmissionResolver'
import { fetchCurrentUserResolver } from './fetchCurrentUser'
import { fetchDraftSubmissionResolver } from './fetchDraftSubmission'
import { fetchStateSubmissionResolver } from './fetchStateSubmission'
import { fetchHealthPlanPackageResolver } from './fetchHealthPlanPackage'
import { indexSubmissionsResolver } from './indexSubmissions'
import { indexHealthPlanPackagesResolver } from './indexHealthPlanPackages'
import { stateSubmissionResolver } from './stateSubmissionResolver'
import { healthPlanPackageResolver } from './healthPlanPackageResolver'
import { submitHealthPlanPackageResolver } from './submitHealthPlanPackage'
import { unlockHealthPlanPackageResolver } from './unlockHealthPlanPackage'
import { updateDraftSubmissionResolver } from './updateDraftSubmission'
import { updateHealthPlanFormDataResolver } from './updateHealthPlanFormData'
import { stateUserResolver } from './userResolver'

export function configureResolvers(store: Store, emailer: Emailer): Resolvers {
    const resolvers: Resolvers = {
        Date: GraphQLDate,
        DateTime: GraphQLDateTime,
        Query: {
            fetchCurrentUser: fetchCurrentUserResolver(),
            fetchDraftSubmission: fetchDraftSubmissionResolver(store),
            fetchStateSubmission: fetchStateSubmissionResolver(store),
            fetchHealthPlanPackage: fetchHealthPlanPackageResolver(store),
            indexSubmissions: indexSubmissionsResolver(store),
            indexHealthPlanPackages: indexHealthPlanPackagesResolver(store),
        },
        Mutation: {
            createDraftSubmission: createDraftSubmissionResolver(store),
            createHealthPlanPackage: createHealthPlanPackageResolver(store),
            updateDraftSubmission: updateDraftSubmissionResolver(store),
            submitHealthPlanPackage: submitHealthPlanPackageResolver(
                store,
                emailer
            ),
            unlockHealthPlanPackage: unlockHealthPlanPackageResolver(
                store,
                emailer
            ),
            updateHealthPlanFormData: updateHealthPlanFormDataResolver(store),
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
        HealthPlanPackage: healthPlanPackageResolver,
        DraftSubmission: draftSubmissionResolver(store),
        StateSubmission: stateSubmissionResolver(store),
    }

    return resolvers
}
