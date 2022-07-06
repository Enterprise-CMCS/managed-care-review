import {
    getStateAnalystsEmails,
    getStateAnalystsEmailsLocal,
} from './getStateAnalystsEmails'

export type ParameterStore = {
    getStateAnalystsEmails: (stateCode: string) => Promise<string[] | Error>
}

function newLocalParameterStore(): ParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmailsLocal,
    }
}

function newAWSParameterStore(): ParameterStore {
    return {
        getStateAnalystsEmails: getStateAnalystsEmails,
    }
}

export { newAWSParameterStore, newLocalParameterStore }
