import { getParameterStore } from '../../awsParameterStore'

export const getDMCOEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/dmco`
    const dmcoTeamAddresses = await getParameterStore(name)

    if (dmcoTeamAddresses instanceof Error) {
        return dmcoTeamAddresses
    }

    const { type, value } = dmcoTeamAddresses

    if (type !== 'StringList') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    //Split string into array using ',' separator and trim each array item.
    return value.split(',').map((email) => email.trim())
}

export const getDMCOEmailsLocal = async (): Promise<string[] | Error> => [
    `"DMCO Reviewer 1" <dmco-reviewer.1@example.com>`,
    `"DMCO Reviewer 2" <dmco-reviewer.2@example.com>`,
    `"DMCO Reviewer 3" <dmco-reviewer.3@example.com>`,
]
