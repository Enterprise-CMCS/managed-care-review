import { GraphQLDate, GraphQLDateTime, GraphQLJSON } from 'graphql-scalars'
import type { Emailer } from '../emailer'
import type { Resolvers } from '../gen/gqlServer'
import type { Store } from '../postgres'
import {
    createContractQuestionResolver,
    adminCreateContractQuestionResolver,
    adminCreateContractQuestionResponseResolver,
    deleteContractQuestionResolver,
    deleteContractQuestionResponseResolver,
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
import {
    rateResolver,
    rateStrippedResolver,
    rateRevisionResolver,
    rateFormDataResolver,
    indexRatesPaginatedResolver,
    indexRatesResolver,
    indexRatesStripped,
    fetchRateResolver,
    submitRate,
    unlockRate,
    withdrawRate,
    undoWithdrawRate,
    overrideRateData,
} from './rate'
import { genericDocumentResolver } from './shared/genericDocumentResolver'
import { updateContract } from './contract/updateContract'
import { overrideContractData } from './contract/overrideContractData'
import { indexContractsResolver } from './contract/indexContracts'
import { indexContractsStripped } from './contract/indexContractsStripped'
import { unlockContractResolver } from './contract/unlockContract'
import { updateDraftContractRates } from './contract/updateDraftContractRates'
import {
    contractResolver,
    contractStrippedResolver,
    unlockedContractResolver,
} from './contract/contractResolver'
import {
    contractRevisionResolver,
    contractRevisionStrippedResolver,
} from './contract/contractRevisionResolver'
import { fetchContractResolver } from './contract/fetchContract'
import { fetchRevisionDiffResolver } from './contract/fetchRevisionDiff'
import { fetchSubmissionHistoryResolver } from './contract/fetchSubmissionHistory'
import { submitContract } from './contract/submitContract'
import type { S3ClientT } from '../s3'
import { createContract } from './contract/createContract'
import { updateContractDraftRevision } from './contract/updateContractDraftRevision'
import { approveContract } from './contract/approveContract'
import { reverseApproveContract } from './contract/reverseApproveContract'
import { undoUnlockContract } from './contract/undoUnlockContract'
import { fetchMcReviewSettings } from './settings'
import { updateStateAssignmentsByState } from './user/updateStateAssignmentsByState'
import { updateEmailSettings } from './settings/updateEmailSettings'
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
import { fetchDocumentResolver } from './documents/fetchDocument'
import { generateUploadURLResolver } from './documents/generateUploadURL'

export function configureResolvers(
    store: Store,
    emailer: Emailer,
    launchDarkly: LDService,
    s3Client: S3ClientT,
    applicationEndpoint: string,
    documentZip: DocumentZipService
): Resolvers {
    const resolvers: Resolvers = {
        Date: GraphQLDate,
        DateTime: GraphQLDateTime,
        JSON: GraphQLJSON,
        Query: {
            fetchCurrentUser: fetchCurrentUserResolver(),
            fetchDocument: fetchDocumentResolver(store, s3Client),
            indexContracts: indexContractsResolver(store, launchDarkly),
            indexContractsStripped: indexContractsStripped(store),
            indexUsers: indexUsersResolver(store),
            fetchMcReviewSettings: fetchMcReviewSettings(store, emailer),
            // Rates refactor
            indexRates: indexRatesResolver(store),
            indexRatesPaginated: indexRatesPaginatedResolver(store),
            indexRatesStripped: indexRatesStripped(store),
            fetchRate: fetchRateResolver(store),
            fetchContract: fetchContractResolver(store),
            fetchRevisionDiff: fetchRevisionDiffResolver(store),
            fetchSubmissionHistory: fetchSubmissionHistoryResolver(store),
            fetchOauthClients: fetchOauthClientsResolver(store),
        },
        Mutation: {
            submitContract: submitContract(
                store,
                emailer,
                launchDarkly,
                documentZip
            ),
            unlockContract: unlockContractResolver(
                store,
                emailer,
                launchDarkly
            ),
            createContract: createContract(store),
            updateContract: updateContract(store),
            updateContractDraftRevision: updateContractDraftRevision(
                store,
                launchDarkly
            ),
            updateDraftContractRates: updateDraftContractRates(store),
            approveContract: approveContract(store, launchDarkly),
            reverseApproveContract: reverseApproveContract(store, launchDarkly),
            undoUnlockContract: undoUnlockContract(store, launchDarkly),
            withdrawContract: withdrawContract(
                store,
                emailer,
                documentZip,
                launchDarkly
            ),
            undoWithdrawContract: undoWithdrawContract(
                store,
                emailer,
                documentZip,
                launchDarkly
            ),
            withdrawRate: withdrawRate(store, emailer, launchDarkly),
            undoWithdrawRate: undoWithdrawRate(store, emailer, launchDarkly),
            overrideContractData: overrideContractData(store),
            overrideRateData: overrideRateData(store),
            updateDivisionAssignment: updateDivisionAssignment(store),
            updateStateAssignment: updateStateAssignment(store),
            updateStateAssignmentsByState: updateStateAssignmentsByState(store),
            createContractQuestion: createContractQuestionResolver(
                store,
                emailer,
                launchDarkly
            ),
            deleteContractQuestion: deleteContractQuestionResolver(
                store,
                launchDarkly
            ),
            deleteContractQuestionResponse:
                deleteContractQuestionResponseResolver(store),
            adminCreateContractQuestion:
                adminCreateContractQuestionResolver(store),
            adminCreateContractQuestionResponse:
                adminCreateContractQuestionResponseResolver(store),
            createContractQuestionResponse:
                createContractQuestionResponseResolver(store, emailer),
            createRateQuestion: createRateQuestionResolver(store, emailer),
            createRateQuestionResponse: createRateQuestionResponseResolver(
                store,
                emailer
            ),
            unlockRate: unlockRate(store),
            submitRate: submitRate(store, launchDarkly, documentZip),
            updateEmailSettings: updateEmailSettings(store),
            createOauthClient: createOauthClientResolver(store),
            deleteOauthClient: deleteOauthClientResolver(store),
            updateOauthClient: updateOauthClientResolver(store),
            generateUploadURL: generateUploadURLResolver(
                store,
                s3Client,
                launchDarkly
            ),
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
                } else if (obj.role === 'READONLY_USER') {
                    return 'ReadOnlyUser'
                } else {
                    return 'StateUser'
                }
            },
        },
        CMSUsersUnion: {
            __resolveType(obj) {
                if (obj.role === 'CMS_USER') {
                    return 'CMSUser'
                } else if (obj.role === 'CMS_APPROVER_USER') {
                    return 'CMSApproverUser'
                } else {
                    return null
                }
            },
        },
        OAuthUser: {
            __resolveType(obj) {
                if (obj.role === 'CMS_USER') {
                    return 'CMSUser'
                } else if (obj.role === 'CMS_APPROVER_USER') {
                    return 'CMSApproverUser'
                } else if (obj.role === 'ADMIN_USER') {
                    return 'AdminUser'
                } else {
                    return null
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
        Rate: rateResolver(store, applicationEndpoint),
        RateStripped: rateStrippedResolver(store, applicationEndpoint),
        RateRevision: rateRevisionResolver(store),
        RateFormData: rateFormDataResolver(),
        ContractQuestion: questionResolver(store),
        RateQuestion: questionResolver(store),
        ContractStripped: contractStrippedResolver(launchDarkly),
        Contract: contractResolver(store, applicationEndpoint, launchDarkly),
        UnlockedContract: unlockedContractResolver(
            store,
            applicationEndpoint,
            launchDarkly
        ),
        ContractRevision: contractRevisionResolver(store),
        ContractRevisionStripped: contractRevisionStrippedResolver(store),
        GenericDocument: genericDocumentResolver(s3Client),
        Document: questionResponseDocumentResolver(s3Client),
        DocumentZipPackage: documentZipPackageResolver(s3Client),
    }

    return resolvers
}
