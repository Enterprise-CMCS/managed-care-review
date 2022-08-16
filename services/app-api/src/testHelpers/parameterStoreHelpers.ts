import { HealthPlanFormDataType } from 'app-web/src/common-code/healthPlanFormDataType'

export type ParameterStore = {
    getStateAnalystsEmails: (stateCode: string) => Promise<string[] | Error>
    getCmsReviewSharedEmails: () => Promise<string[] | Error>
    getRatesReviewSharedEmails: () => Promise<string[] | Error>
}

function mockEmailParameterStoreError(error?: string): ParameterStore {
    const message = error || 'No store found'
    return {
        getStateAnalystsEmails: async (stateCode: string): Promise<Error> => {
            return new Error(message)
        },
        getCmsReviewSharedEmails: async (): Promise<Error> => {
            return new Error(message)
        },
        getRatesReviewSharedEmails: async (): Promise<Error> => {
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

const getTestCmsReviewSharedEmails = (): string[] => [
    `"CMS Reviewer 1" <CMS.reviewer.1@example.com>`,
    `"CMS Reviewer 2" <CMS.reviewer.2@example.com>`,
    `"CMS Reviewer 3" <CMS.reviewer.3@example.com>`,
]

const getTestRatesReviewSharedEmails = (): string[] => [
    `"Rate Submission Reviewer 1" <rate.reviewer.1@example.com>`,
    `"Rate Submission Reviewer 2" <rate.reviewer.2@example.com>`,
    `"Rate Submission Reviewer 3" <rate.reviewer.3@example.com>`,
]

export {
    mockEmailParameterStoreError,
    getTestStateAnalystsEmails,
    getTestCmsReviewSharedEmails,
    getTestRatesReviewSharedEmails,
}
