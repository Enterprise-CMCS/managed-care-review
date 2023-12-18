import { ParameterStore } from '../../awsParameterStore'
import { validateAndReturnValueArray } from '../helpers'

export const getDMCPReviewEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/dmcpReview`
    const dmcpTeamAddresses = await ParameterStore.getParameter(name)
    return validateAndReturnValueArray(dmcpTeamAddresses, name)
}

export const getDMCPReviewEmailsLocal = async (): Promise<string[] | Error> => [
    `"DMCP Reviewer 1" <dmcp-reviewer.1@example.com>`,
    `"DMCP Reviewer 2" <dmcp-reviewer.2@example.com>`,
    `"DMCP Reviewer 3" <dmcp-reviewer.3@example.com>`,
]
