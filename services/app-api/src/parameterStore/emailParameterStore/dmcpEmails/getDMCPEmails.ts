import { ParameterStore } from '../../awsParameterStore'
import { validateAndReturnValueArray } from '../helpers'

export const getDMCPEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/dmcp`
    const dmcpTeamAddresses = await ParameterStore.getParameter(name)
    return validateAndReturnValueArray(dmcpTeamAddresses, name)
}

export const getDMCPEmailsLocal = async (): Promise<string[] | Error> => [
    `"DMCP Reviewer 1" <dmcp-reviewer.1@example.com>`,
    `"DMCP Reviewer 2" <dmcp-reviewer.2@example.com>`,
    `"DMCP Reviewer 3" <dmcp-reviewer.3@example.com>`,
]
