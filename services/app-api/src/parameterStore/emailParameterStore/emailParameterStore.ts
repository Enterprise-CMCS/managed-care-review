import type { StateCodeType } from '@mc-review/hpp'
import {
    getStateAnalystsEmails,
    getStateAnalystsEmailsLocal,
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
    getStateAnalystsSettings,
    getStateAnalystsSettingsLocal,
    getHelpDeskEmail,
    getHelpDeskEmailLocal,
} from './'
import type { StateAnalystsWithState } from './stateAnalystsEmails/getStateAnalystsSettings'

export type EmailParameterStore = {
    getStateAnalystsSettings: (
        stateCodes: StateCodeType[]
    ) => Promise<StateAnalystsWithState | Error>
    getStateAnalystsEmails: (stateCode: string) => Promise<string[] | Error>
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
        getStateAnalystsSettings: getStateAnalystsSettingsLocal,
        getStateAnalystsEmails: getStateAnalystsEmailsLocal,
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
        getStateAnalystsSettings: getStateAnalystsSettings,
        getStateAnalystsEmails: getStateAnalystsEmails,
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
