import { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'

export type ParameterStore = {
    getStateAnalystsEmails: (stateCode: string) => Promise<string[] | Error>
}

function mockEmailParameterStoreError(error?: string): ParameterStore {
    const message = error || 'No store found'
    return {
        getStateAnalystsEmails: async (stateCode: string): Promise<Error> => {
            return new Error(message)
        },
    }
}

const getTestStateAnalystsEmails = (
    submission: HealthPlanFormDataType
): string[] => [
    `"${submission.stateCode} State Analyst 1" <${submission.stateCode}StateAnalyst1@example.com>`,
    `"${submission.stateCode} State Analyst 2" <${submission.stateCode}StateAnalyst2@example.com>`,
]

export { mockEmailParameterStoreError, getTestStateAnalystsEmails }
