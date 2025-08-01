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
    createContractQuestionResolver,
    createContractQuestionResponseResolver,
    questionResponseDocumentResolver,
    createRateQuestionResolver,
    createRateQuestionResponseResolver,
    questionResolver,
} from './questionResponse'
import {
    fetchCurrentUserResolver,
    updateDivisionAssignment,
    stateUserResolver,
    cmsUserResolver,
    indexUsersResolver,
    cmsApproverUserResolver,
    updateStateAssignment,
} from './user'
import type { LDService } from '../launchDarkly/launchDarkly'
import type { JWTLib } from '../jwt'
import { indexRatesResolver } from './rate'
import { rateResolver } from './rate'
import { genericDocumentResolver } from './shared/genericDocumentResolver'
import { fetchRateResolver } from './rate/fetchRate'
import { updateContract } from './contract/updateContract'
import { indexContractsResolver } from './contract/indexContracts'
import { unlockContractResolver } from './contract/unlockContract'
import { createAPIKeyResolver } from './APIKey'
import { unlockRate } from './rate/unlockRate'
import { submitRate } from './rate'
import { updateDraftContractRates } from './contract/updateDraftContractRates'
import {
    contractResolver,
    unlockedContractResolver,
} from './contract/contractResolver'
import { contractRevisionResolver } from './contract/contractRevisionResolver'
import { fetchContractResolver } from './contract/fetchContract'
import { submitContract } from './contract/submitContract'
import { rateRevisionResolver } from './rate/rateRevisionResolver'
import type { S3ClientT } from '../s3'
import { createContract } from './contract/createContract'
import { updateContractDraftRevision } from './contract/updateContractDraftRevision'
import { approveContract } from './contract/approveContract'
import { fetchMcReviewSettings } from './settings'
import { updateStateAssignmentsByState } from './user/updateStateAssignmentsByState'
import { rateFormDataResolver } from './rate/rateFormDataResolver'
import { withdrawRate } from './rate/withdrawRate'
import { updateEmailSettings } from './settings/updateEmailSettings'
import { undoWithdrawRate } from './rate/undoWithdrawRate'
import { rateStrippedResolver } from './rate/rateResolver'
import { indexRatesStripped } from './rate/indexRatesStripped'
import { withdrawContract } from './contract/withdrawContract'
import { undoWithdrawContract } from './contract/undoWithdrawContract'
import { documentZipPackageResolver } from './documents'
import {
    createOauthClientResolver,
    fetchOauthClientsResolver,
    deleteOauthClientResolver,
    updateOauthClientResolver,
} from './oauthClient'
import type { DocumentZipService } from '../zip/generateZip'

export function configureResolvers(
    store: Store,
    emailer: Emailer,
    launchDarkly: LDService,
    jwt: JWTLib,
    s3Client: S3ClientT,
    applicationEndpoint: string,
    documentZip: DocumentZipService
): Resolvers {
    const resolvers: Resolvers = {
        Date: GraphQLDate,
        DateTime: GraphQLDateTime,
        Query: {
            fetchCurrentUser: fetchCurrentUserResolver(),
            fetchHealthPlanPackage: fetchHealthPlanPackageResolver(store),
            indexHealthPlanPackages: indexHealthPlanPackagesResolver(store),
            indexContracts: indexContractsResolver(store),
            indexUsers: indexUsersResolver(store),
            fetchMcReviewSettings: fetchMcReviewSettings(store, emailer),
            // Rates refactor
            indexRates: indexRatesResolver(store),
            indexRatesStripped: indexRatesStripped(store),
            fetchRate: fetchRateResolver(store),
            fetchContract: fetchContractResolver(store),
            fetchOauthClients: fetchOauthClientsResolver(store),
        },
        Mutation: {
            createHealthPlanPackage: createHealthPlanPackageResolver(store),
            updateHealthPlanFormData: updateHealthPlanFormDataResolver(
                store,
                launchDarkly
            ),
            submitHealthPlanPackage: submitHealthPlanPackageResolver(
                store,
                launchDarkly
            ),
            submitContract: submitContract(
                store,
                emailer,
                launchDarkly,
                documentZip
            ),
            unlockHealthPlanPackage: unlockHealthPlanPackageResolver(
                store,
                emailer
            ),
            unlockContract: unlockContractResolver(store, emailer),
            createContract: createContract(store),
            updateContract: updateContract(store),
            updateContractDraftRevision: updateContractDraftRevision(
                store,
                launchDarkly
            ),
            updateDraftContractRates: updateDraftContractRates(store),
            approveContract: approveContract(store),
            withdrawContract: withdrawContract(store, emailer),
            undoWithdrawContract: undoWithdrawContract(store, emailer),
            withdrawRate: withdrawRate(store, emailer),
            undoWithdrawRate: undoWithdrawRate(store, emailer),
            updateDivisionAssignment: updateDivisionAssignment(store),
            updateStateAssignment: updateStateAssignment(store),
            updateStateAssignmentsByState: updateStateAssignmentsByState(store),
            createContractQuestion: createContractQuestionResolver(
                store,
                emailer
            ),
            createContractQuestionResponse:
                createContractQuestionResponseResolver(store, emailer),
            createRateQuestion: createRateQuestionResolver(store, emailer),
            createRateQuestionResponse: createRateQuestionResponseResolver(
                store,
                emailer
            ),
            createAPIKey: createAPIKeyResolver(jwt),
            unlockRate: unlockRate(store),
            submitRate: submitRate(store, launchDarkly, documentZip),
            updateEmailSettings: updateEmailSettings(store),
            createOauthClient: createOauthClientResolver(store),
            deleteOauthClient: deleteOauthClientResolver(store),
            updateOauthClient: updateOauthClientResolver(store),
        },
        User: {
            // resolveType is required to differentiate Unions
            __resolveType(obj) {
                if (obj.role === 'STATE_USER') {
                    return 'StateUser'
                } else if (obj.role === 'CMS_USER') {
                    return 'CMSUser'
                } else if (obj.role === 'CMS_APPROVER_USER') {
                    return 'CMSApproverUser'
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
        CMSUsersUnion: {
            __resolveType(obj) {
                if (obj.role === 'CMS_USER') {
                    return 'CMSUser'
                } else {
                    return 'CMSApproverUser'
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
        CMSApproverUser: cmsApproverUserResolver,
        HealthPlanPackage: healthPlanPackageResolver(store),
        Rate: rateResolver(store, applicationEndpoint),
        RateStripped: rateStrippedResolver(store, applicationEndpoint),
        RateRevision: rateRevisionResolver(store),
        RateFormData: rateFormDataResolver(),
        ContractQuestion: questionResolver(store),
        RateQuestion: questionResolver(store),
        Contract: contractResolver(store, applicationEndpoint),
        UnlockedContract: unlockedContractResolver(store, applicationEndpoint),
        ContractRevision: contractRevisionResolver(store),
        GenericDocument: genericDocumentResolver(s3Client),
        Document: questionResponseDocumentResolver(s3Client),
        DocumentZipPackage: documentZipPackageResolver(s3Client),
    }

    return resolvers
}
