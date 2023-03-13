import {
    getStateAnalystsEmails,
    getStateAnalystsEmailsLocal,
    getDevReviewTeamEmails,
    getDevReviewTeamEmailsLocal,
    getCmsReviewHelpEmail,
    getCmsReviewHelpEmailLocal,
    getCmsRateHelpEmail,
    getCmsRateHelpEmailLocal,
    getCmsDevTeamHelpEmail,
    getCmsDevTeamHelpEmailLocal,
    getDMCPEmails,
    getDMCPEmailsLocal,
    getOACTEmails,
    getOACTEmailsLocal,
    getDMCOEmails,
    getDMCOEmailsLocal,
    getSourceEmailLocal,
    getSourceEmail,
} from './'

export type EmailParameterStore = {
    getStateAnalystsEmails: (stateCode: string) => Promise<string[] | Error>
    getDevReviewTeamEmails: () => Promise<string[] | Error>
    getCmsReviewHelpEmail: () => Promise<string | Error>
    getCmsRateHelpEmail: () => Promise<string | Error>
    getCmsDevTeamHelpEmail: () => Promise<string | Error>
    getDMCPEmails: () => Promise<string[] | Error>
    getOACTEmails: () => Promise<string[] | Error>
    getDMCOEmails: () => Promise<string[] | Error>
    getSourceEmail: () => Promise<string | Error>
}

function newLocalEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmailsLocal,
        getDevReviewTeamEmails: getDevReviewTeamEmailsLocal,
        getCmsReviewHelpEmail: getCmsReviewHelpEmailLocal,
        getCmsRateHelpEmail: getCmsRateHelpEmailLocal,
        getCmsDevTeamHelpEmail: getCmsDevTeamHelpEmailLocal,
        getDMCPEmails: getDMCPEmailsLocal,
        getOACTEmails: getOACTEmailsLocal,
        getDMCOEmails: getDMCOEmailsLocal,
        getSourceEmail: getSourceEmailLocal,
    }
}

function newAWSEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmails,
        getDevReviewTeamEmails: getDevReviewTeamEmails,
        getCmsReviewHelpEmail: getCmsReviewHelpEmail,
        getCmsRateHelpEmail: getCmsRateHelpEmail,
        getCmsDevTeamHelpEmail: getCmsDevTeamHelpEmail,
        getDMCOEmails: getDMCOEmails,
        getDMCPEmails: getDMCPEmails,
        getOACTEmails: getOACTEmails,
        getSourceEmail: getSourceEmail,
    }
}

export { newAWSEmailParameterStore, newLocalEmailParameterStore }
