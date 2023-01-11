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
import { updateStateAssignmentsResolver } from './updateStateAssignments'
import { stateUserResolver, cmsUserResolver } from './userResolver'
import { EmailParameterStore } from '../parameterStore'
import { LDService } from '../launchDarkly/launchDarkly'
import { indexUsersResolver } from './indexUsers'

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
            indexUsers: indexUsersResolver(store),
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
            updateStateAssignments: updateStateAssignmentsResolver(store),
        },
        User: {
            // resolveType is required to differentiate Unions
            __resolveType(obj) {
                if (obj.role === 'STATE_USER') {
                    return 'StateUser'
                } else if (obj.role === 'CMS_USER') {
                    return 'CMSUser'
                } else if (obj.role === 'ADMIN_USER') {
                    return 'AdminUser'
                } else {
                    return 'StateUser'
                }
            },
        },
        StateUser: stateUserResolver,
        CMSUser: cmsUserResolver,
        HealthPlanPackage: healthPlanPackageResolver,
    }

    return resolvers
}
