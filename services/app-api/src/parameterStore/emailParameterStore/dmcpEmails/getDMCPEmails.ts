import { getParameterStore } from '../../awsParameterStore'

export const getDMCPEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/dmcp`
    const dmcpTeamAddresses = await getParameterStore(name)

    if (dmcpTeamAddresses instanceof Error) {
        return dmcpTeamAddresses
    }

    const { type, value } = dmcpTeamAddresses

    if (type !== 'StringList') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    //Split string into array using ',' separator and trim each array item.
    return value.split(',').map((email) => email.trim())
}

export const getDMCPEmailsLocal = async (): Promise<string[] | Error> => [
    `"DMCP Reviewer 1" <dmcp-reviewer.1@example.com>`,
    `"DMCP Reviewer 2" <dmcp-reviewer.2@example.com>`,
    `"DMCP Reviewer 3" <dmcp-reviewer.3@example.com>`,
]
