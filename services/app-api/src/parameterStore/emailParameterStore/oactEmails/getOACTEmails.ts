import { getParameterStore } from '../../awsParameterStore'
import { validateAndReturnValueArray } from '../helpers'

export const getOACTEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/oact`
    const oactTeamAddresses = await getParameterStore(name)

    return validateAndReturnValueArray(oactTeamAddresses, name)
}

export const getOACTEmailsLocal = async (): Promise<string[] | Error> => [
    `"OACT Reviewer 1" <oact-reviewer.1@example.com>`,
    `"OACT Reviewer 2" <oact-reviewer.2@example.com>`,
    `"OACT Reviewer 3" <oact-reviewer.3@example.com>`,
]
