import { getParameterStore } from '../../awsParameterStore'

export const getOACTEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/oact`
    const oactTeamAddresses = await getParameterStore(name)

    if (oactTeamAddresses instanceof Error) {
        return oactTeamAddresses
    }

    const { type, value } = oactTeamAddresses

    if (type !== 'StringList') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    //Split string into array using ',' separator and trim each array item.
    return value.split(',').map((email) => email.trim())
}

export const getOACTEmailsLocal = async (): Promise<string[] | Error> => [
    `"OACT Reviewer 1" <oact-reviewer.1@example.com>`,
    `"OACT Reviewer 2" <oact-reviewer.2@example.com>`,
    `"OACT Reviewer 3" <oact-reviewer.3@example.com>`,
]
