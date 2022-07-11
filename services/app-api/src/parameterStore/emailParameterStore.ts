import {
    getStateAnalystsEmails,
    getStateAnalystsEmailsLocal,
} from './getStateAnalystsEmails'

export type EmailParameterStore = {
    getStateAnalystsEmails: (stateCode: string) => Promise<string[] | Error>
}

function newLocalEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmailsLocal,
    }
}

function newAWSEmailParameterStore(): EmailParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmails,
    }
}

export { newAWSEmailParameterStore, newLocalEmailParameterStore }
