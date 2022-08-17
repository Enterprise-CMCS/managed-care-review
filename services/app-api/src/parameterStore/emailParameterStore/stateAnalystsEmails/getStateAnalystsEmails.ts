import { getParameterStore } from '../../awsParameterStore'

export const getStateAnalystsEmails = async (
    stateCode: string
): Promise<string[] | string | Error> => {
    return await getParameterStore(
        `/configuration/${stateCode}/stateanalysts/email`
    )
}

export const getStateAnalystsEmailsLocal = async (
    stateCode: string
): Promise<string[] | Error> => [
    `"${stateCode} State Analyst 1" <${stateCode}StateAnalyst1@example.com>`,
    `"${stateCode} State Analyst 2" <${stateCode}StateAnalyst2@example.com>`,
]
