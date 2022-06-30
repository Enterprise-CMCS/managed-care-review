import { getParameterStore } from './awsParameterStore'
import { getStateAnalystEmails } from './getStateAnalystEmails'
import { Context } from '../handlers/apollo_gql'

export type ParameterStore = {
    getStateAnalystEmails: (
        stateCode: string,
        span?: Context['span'],
        operation?: string
    ) => Promise<string[]>
}

function newLocalParameterStore(): ParameterStore {
    return {
        getStateAnalystEmails: async (
            stateCode: string,
            span?: Context['span'],
            operation?: string
        ): Promise<string[]> => {
            const analystsParameterStore = `"${stateCode} State Analyst 1" <${stateCode}StateAnalyst1@example.com>, "${stateCode} State Analyst 2" <${stateCode}StateAnalyst2@example.com>`
            //Split string into array using ',' separator and trim each array item.
            return analystsParameterStore
                .split(',')
                .map((email) => email.trim())
        },
    }
}

function newAWSParameterStore(): ParameterStore {
    return {
        getStateAnalystEmails: getStateAnalystEmails,
    }
}

export { getParameterStore, newAWSParameterStore, newLocalParameterStore }
