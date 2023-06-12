import { ParameterStore } from '../../awsParameterStore'
import { validateAndReturnValueArray } from '../helpers'

export const getDMCOEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/dmco`
    const dmcoTeamAddresses = await ParameterStore.getParameter(name)

    return validateAndReturnValueArray(dmcoTeamAddresses, name)
}

export const getDMCOEmailsLocal = async (): Promise<string[] | Error> => [
    `"DMCO Reviewer 1" <dmco-reviewer.1@example.com>`,
    `"DMCO Reviewer 2" <dmco-reviewer.2@example.com>`,
    `"DMCO Reviewer 3" <dmco-reviewer.3@example.com>`,
]
