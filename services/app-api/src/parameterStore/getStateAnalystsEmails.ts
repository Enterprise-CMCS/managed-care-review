import { getParameterStore } from './parameterStore'

export const getStateAnalystsEmails = async (
    stateCode: string
): Promise<string[] | Error> => {
    const analystsParameterStore = await getParameterStore(
        `/configuration/${stateCode}/stateanalysts/email`
    )
    if (analystsParameterStore instanceof Error) {
        return analystsParameterStore
    } else {
        //Split string into array using ',' separator and trim each array item.
        return analystsParameterStore.split(',').map((email) => email.trim())
    }
}

export const getStateAnalystsEmailsLocal = async (
    stateCode: string
): Promise<string[] | Error> => [
    `"${stateCode} State Analyst 1" <${stateCode}StateAnalyst1@example.com>`,
    `"${stateCode} State Analyst 2" <${stateCode}StateAnalyst2@example.com>`,
]
