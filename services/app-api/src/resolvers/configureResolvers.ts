import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'
import type { Emailer } from '../emailer'
import { Resolvers } from '../gen/gqlServer'
import type { Store } from '../postgres'
import { createHealthPlanPackageResolver } from './createHealthPlanPackage'
import { fetchCurrentUserResolver } from './fetchCurrentUser'
import { fetchHealthPlanPackageResolver } from './fetchHealthPlanPackage'
import { indexHealthPlanPackagesResolver } from './indexHealthPlanPackages'
import { healthPlanPackageResolver } from './healthPlanPackageResolver'
import { submitHealthPlanPackageResolver } from './submitHealthPlanPackage'
import { unlockHealthPlanPackageResolver } from './unlockHealthPlanPackage'
import { updateHealthPlanFormDataResolver } from './updateHealthPlanFormData'
import { stateUserResolver } from './userResolver'
import { EmailParameterStore } from '../parameterStore'
import { LDService } from '../launchDarkly/launchDarkly'

export function configureResolvers(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): Resolvers {
    const resolvers: Resolvers = {
        Date: GraphQLDate,
        DateTime: GraphQLDateTime,
        Query: {
            fetchCurrentUser: fetchCurrentUserResolver(),
            fetchHealthPlanPackage: fetchHealthPlanPackageResolver(store),
            indexHealthPlanPackages: indexHealthPlanPackagesResolver(store),
        },
        Mutation: {
            createHealthPlanPackage: createHealthPlanPackageResolver(store),
            updateHealthPlanFormData: updateHealthPlanFormDataResolver(store),
            submitHealthPlanPackage: submitHealthPlanPackageResolver(
                store,
                emailer,
                emailParameterStore,
                launchDarkly
            ),
            unlockHealthPlanPackage: unlockHealthPlanPackageResolver(
                store,
                emailer,
                emailParameterStore
            ),
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
    }

    return resolvers
}
