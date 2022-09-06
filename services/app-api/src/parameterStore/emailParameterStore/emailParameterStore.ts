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
    getSourceEmailLocal,
    getSourceEmail,
} from './'

export type EmailParameterStore = {
    getStateAnalystsEmails: (stateCode: string) => Promise<string[] | Error>
    getCmsReviewSharedEmails: () => Promise<string[] | Error>
    getRatesReviewSharedEmails: () => Promise<string[] | Error>
    getCmsReviewHelpEmail: () => Promise<string | Error>
    getCmsRateHelpEmail: () => Promise<string | Error>
    getCmsDevTeamHelpEmail: () => Promise<string | Error>
    getSourceEmail: () => Promise<string | Error>
}

function newLocalEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmailsLocal,
        getCmsReviewSharedEmails: getCmsReviewSharedEmailsLocal,
        getRatesReviewSharedEmails: getRatesReviewSharedEmailsLocal,
        getCmsReviewHelpEmail: getCmsReviewHelpEmailLocal,
        getCmsRateHelpEmail: getCmsRateHelpEmailLocal,
        getCmsDevTeamHelpEmail: getCmsDevTeamHelpEmailLocal,
        getSourceEmail: getSourceEmailLocal,
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
        getSourceEmail: getSourceEmail,
    }
}

export { newAWSEmailParameterStore, newLocalEmailParameterStore }
