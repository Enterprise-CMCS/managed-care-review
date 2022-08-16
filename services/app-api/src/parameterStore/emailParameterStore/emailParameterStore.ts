import {
    getStateAnalystsEmails,
    getStateAnalystsEmailsLocal,
    getCmsReviewSharedEmails,
    getCmsReviewSharedEmailsLocal,
    getRatesReviewSharedEmails,
    getRatesReviewSharedEmailsLocal,
} from './'

export type EmailParameterStore = {
    getStateAnalystsEmails: (stateCode: string) => Promise<string[] | Error>
    getCmsReviewSharedEmails: () => Promise<string[] | Error>
    getRatesReviewSharedEmails: () => Promise<string[] | Error>
}

function newLocalEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmailsLocal,
        getCmsReviewSharedEmails: getCmsReviewSharedEmailsLocal,
        getRatesReviewSharedEmails: getRatesReviewSharedEmailsLocal,
    }
}

function newAWSEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmails,
        getCmsReviewSharedEmails: getCmsReviewSharedEmails,
        getRatesReviewSharedEmails: getRatesReviewSharedEmails,
    }
}

export { newAWSEmailParameterStore, newLocalEmailParameterStore }
