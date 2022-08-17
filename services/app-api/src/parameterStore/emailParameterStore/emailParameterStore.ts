import {
    getStateAnalystsEmails,
    getStateAnalystsEmailsLocal,
    getCmsReviewSharedEmails,
    getCmsReviewSharedEmailsLocal,
    getRatesReviewSharedEmails,
    getRatesReviewSharedEmailsLocal,
    getCmsReviewHelpEmail,
    getCmsReviewHelpEmailLocal,
    getCmsRateHelpEmail,
    getCmsRateHelpEmailLocal,
    getCmsDevTeamHelpEmail,
    getCmsDevTeamHelpEmailLocal,
} from './'
import { ParameterStoreEmailsType } from '../'

export type EmailParameterStore = {
    getStateAnalystsEmails: (
        stateCode: string
    ) => Promise<ParameterStoreEmailsType>
    getCmsReviewSharedEmails: () => Promise<ParameterStoreEmailsType>
    getRatesReviewSharedEmails: () => Promise<ParameterStoreEmailsType>
    getCmsReviewHelpEmail: () => Promise<ParameterStoreEmailsType>
    getCmsRateHelpEmail: () => Promise<ParameterStoreEmailsType>
    getCmsDevTeamHelpEmail: () => Promise<ParameterStoreEmailsType>
}

function newLocalEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmailsLocal,
        getCmsReviewSharedEmails: getCmsReviewSharedEmailsLocal,
        getRatesReviewSharedEmails: getRatesReviewSharedEmailsLocal,
        getCmsReviewHelpEmail: getCmsReviewHelpEmailLocal,
        getCmsRateHelpEmail: getCmsRateHelpEmailLocal,
        getCmsDevTeamHelpEmail: getCmsDevTeamHelpEmailLocal,
    }
}

function newAWSEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmails,
        getCmsReviewSharedEmails: getCmsReviewSharedEmails,
        getRatesReviewSharedEmails: getRatesReviewSharedEmails,
        getCmsReviewHelpEmail: getCmsReviewHelpEmail,
        getCmsRateHelpEmail: getCmsRateHelpEmail,
        getCmsDevTeamHelpEmail: getCmsDevTeamHelpEmail,
    }
}

export { newAWSEmailParameterStore, newLocalEmailParameterStore }
