import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'
import type { Emailer } from '../emailer'
import { Resolvers } from '../gen/gqlServer'
import type { Store } from '../postgres'
import {
    createHealthPlanPackageResolver,
    fetchHealthPlanPackageResolver,
    indexHealthPlanPackagesResolver,
    healthPlanPackageResolver,
    submitHealthPlanPackageResolver,
    unlockHealthPlanPackageResolver,
    updateHealthPlanFormDataResolver,
} from './healthPlanPackage'
import {
    indexQuestionsResolver,
    createQuestionResolver,
    createQuestionResponseResolver,
} from './questionResponse'
import {
    fetchCurrentUserResolver,
    updateCMSUserResolver,
    stateUserResolver,
    cmsUserResolver,
    indexUsersResolver,
} from './user'
import { EmailParameterStore } from '../parameterStore'
import { fetchEmailSettingsResolver } from './email/fetchEmailSettings'

export function configureResolvers(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore
): Resolvers {
    const resolvers: Resolvers = {
        Date: GraphQLDate,
        DateTime: GraphQLDateTime,
        Query: {
            fetchCurrentUser: fetchCurrentUserResolver(),
            fetchHealthPlanPackage: fetchHealthPlanPackageResolver(store),
            indexHealthPlanPackages: indexHealthPlanPackagesResolver(store),
            indexUsers: indexUsersResolver(store),
            indexQuestions: indexQuestionsResolver(store),
            fetchEmailSettings: fetchEmailSettingsResolver(
                store,
                emailer,
                emailParameterStore
            ),
        },
        Mutation: {
            createHealthPlanPackage: createHealthPlanPackageResolver(store),
            updateHealthPlanFormData: updateHealthPlanFormDataResolver(store),
            submitHealthPlanPackage: submitHealthPlanPackageResolver(
                store,
                emailer,
                emailParameterStore
            ),
            unlockHealthPlanPackage: unlockHealthPlanPackageResolver(
                store,
                emailer,
                emailParameterStore
            ),
            updateCMSUser: updateCMSUserResolver(store),
            createQuestion: createQuestionResolver(store),
            createQuestionResponse: createQuestionResponseResolver(store),
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
                } else if (obj.role === 'HELPDESK_USER') {
                    return 'HelpdeskUser'
                } else {
                    return 'StateUser'
                }
            },
        },
        StateUser: stateUserResolver,
        CMSUser: cmsUserResolver,
        HealthPlanPackage: healthPlanPackageResolver(store),
    }

    return resolvers
}
