import {
    getDevReviewTeamEmails,
    getDevReviewTeamEmailsLocal,
    getCmsReviewHelpEmail,
    getCmsReviewHelpEmailLocal,
    getCmsRateHelpEmail,
    getCmsRateHelpEmailLocal,
    getDMCPReviewEmails,
    getDMCPSubmissionEmails,
    getDMCPReviewEmailsLocal,
    getDMCPSubmissionEmailsLocal,
    getOACTEmails,
    getOACTEmailsLocal,
    getDMCOEmails,
    getDMCOEmailsLocal,
    getSourceEmailLocal,
    getSourceEmail,
    getHelpDeskEmail,
    getHelpDeskEmailLocal,
} from './'

export type EmailParameterStore = {
    getDevReviewTeamEmails: () => Promise<string[] | Error>
    getCmsReviewHelpEmail: () => Promise<string | Error>
    getCmsRateHelpEmail: () => Promise<string | Error>
    getDMCPReviewEmails: () => Promise<string[] | Error>
    getDMCPSubmissionEmails: () => Promise<string[] | Error>
    getOACTEmails: () => Promise<string[] | Error>
    getDMCOEmails: () => Promise<string[] | Error>
    getSourceEmail: () => Promise<string | Error>
    getHelpDeskEmail: () => Promise<string | Error>
}

function newLocalEmailParameterStore(): EmailParameterStore {
    return {
        getDevReviewTeamEmails: getDevReviewTeamEmailsLocal,
        getCmsReviewHelpEmail: getCmsReviewHelpEmailLocal,
        getCmsRateHelpEmail: getCmsRateHelpEmailLocal,
        getDMCPReviewEmails: getDMCPReviewEmailsLocal,
        getDMCPSubmissionEmails: getDMCPSubmissionEmailsLocal,
        getOACTEmails: getOACTEmailsLocal,
        getDMCOEmails: getDMCOEmailsLocal,
        getSourceEmail: getSourceEmailLocal,
        getHelpDeskEmail: getHelpDeskEmailLocal,
    }
}

function newAWSEmailParameterStore(): EmailParameterStore {
    return {
        getDevReviewTeamEmails: getDevReviewTeamEmails,
        getCmsReviewHelpEmail: getCmsReviewHelpEmail,
        getCmsRateHelpEmail: getCmsRateHelpEmail,
        getDMCOEmails: getDMCOEmails,
        getDMCPReviewEmails: getDMCPReviewEmails,
        getDMCPSubmissionEmails: getDMCPSubmissionEmails,
        getOACTEmails: getOACTEmails,
        getSourceEmail: getSourceEmail,
        getHelpDeskEmail: getHelpDeskEmail,
    }
}

export { newAWSEmailParameterStore, newLocalEmailParameterStore }
