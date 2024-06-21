import { GraphQLDate, GraphQLDateTime } from 'graphql-scalars'
import type { Emailer } from '../emailer'
import type { Resolvers } from '../gen/gqlServer'
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
import type { EmailParameterStore } from '../parameterStore'
import type { LDService } from '../launchDarkly/launchDarkly'
import type { JWTLib } from '../jwt'
import { fetchEmailSettingsResolver } from './email/fetchEmailSettings'
import { indexRatesResolver } from './rate/indexRates'
import { rateResolver } from './rate/rateResolver'
import { fetchRateResolver } from './rate/fetchRate'
import { updateContract } from './contract/updateContract'
import { createAPIKeyResolver } from './APIKey'
import { unlockRate } from './rate/unlockRate'
import { submitRate } from './rate/submitRate'
import { updateDraftContractRates } from './contract/updateDraftContractRates'
import { contractResolver } from './contract/contractResolver'
import { contractRevisionResolver } from './contract/contractRevisionResolver'
import { fetchContractResolver } from './contract/fetchContract'
import { submitContract } from './contract/submitContract'
import { rateRevisionResolver } from './rate/rateRevisionResolver'
import { createContract } from './contract/createContract'
import { updateContractDraftRevision } from './contract/updateContractDraftRevision'

export function configureResolvers(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService,
    jwt: JWTLib
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
            // Rates refactor
            indexRates: indexRatesResolver(store),
            fetchRate: fetchRateResolver(store),
            fetchContract: fetchContractResolver(store),
        },
        Mutation: {
            createHealthPlanPackage: createHealthPlanPackageResolver(store),
            updateHealthPlanFormData: updateHealthPlanFormDataResolver(
                store,
                launchDarkly
            ),
            submitHealthPlanPackage: submitHealthPlanPackageResolver(
                store,
                emailer,
                emailParameterStore,
                launchDarkly
            ),
            submitContract: submitContract(
                store,
                emailer,
                emailParameterStore,
                launchDarkly
            ),
            unlockHealthPlanPackage: unlockHealthPlanPackageResolver(
                store,
                emailer,
                emailParameterStore,
                launchDarkly
            ),
            createContract: createContract(store),
            updateContract: updateContract(store),
            updateContractDraftRevision: updateContractDraftRevision(
                store,
                launchDarkly
            ),
            updateDraftContractRates: updateDraftContractRates(store),
            updateCMSUser: updateCMSUserResolver(store),
            createQuestion: createQuestionResolver(
                store,
                emailParameterStore,
                emailer
            ),
            createQuestionResponse: createQuestionResponseResolver(
                store,
                emailer,
                emailParameterStore
            ),
            createAPIKey: createAPIKeyResolver(jwt),
            unlockRate: unlockRate(store),
            submitRate: submitRate(store, launchDarkly),
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
                } else if (obj.role === 'BUSINESSOWNER_USER') {
                    return 'BusinessOwnerUser'
                } else {
                    return 'StateUser'
                }
            },
        },
        SubmittableRevision: {
            __resolveType(obj) {
                if ('contract' in obj) {
                    return 'ContractRevision'
                } else {
                    return 'RateRevision'
                }
            },
        },
        StateUser: stateUserResolver,
        CMSUser: cmsUserResolver,
        HealthPlanPackage: healthPlanPackageResolver(store),
        Rate: rateResolver,
        RateRevision: rateRevisionResolver,
        Contract: contractResolver(),
        ContractRevision: contractRevisionResolver(store),
    }

    return resolvers
}
