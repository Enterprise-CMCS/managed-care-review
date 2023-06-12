import { ParameterStore } from '../../awsParameterStore'

const getStateAnalystsEmails = async (
    stateCode: string
): Promise<string[] | Error> => {
    const name = `/configuration/${stateCode}/stateanalysts/email`
    const stateAnalysts = await ParameterStore.getParameter(name)

    if (stateAnalysts instanceof Error) {
        return stateAnalysts
    }

    const { type, value } = stateAnalysts

    if (type !== 'StringList') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    //Split string into array using ',' separator and trim each array item.
    return value.split(',').map((email) => email.trim())
}

const getStateAnalystsEmailsLocal = async (
    stateCode: string
): Promise<string[] | Error> => [
    `"${stateCode} State Analyst 1" <${stateCode}StateAnalyst1@example.com>`,
    `"${stateCode} State Analyst 2" <${stateCode}StateAnalyst2@example.com>`,
]

export { getStateAnalystsEmails, getStateAnalystsEmailsLocal }
