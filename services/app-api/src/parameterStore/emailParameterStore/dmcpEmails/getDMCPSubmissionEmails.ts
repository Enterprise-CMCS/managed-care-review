import { ParameterStore } from '../../awsParameterStore'
import { validateAndReturnValueArray } from '../helpers'

export const getDMCPSubmissionEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/dmcpSubmission`
    const dmcpTeamAddresses = await ParameterStore.getParameter(name)
    return validateAndReturnValueArray(dmcpTeamAddresses, name)
}

export const getDMCPSubmissionEmailsLocal = async (): Promise<
    string[] | Error
> => [
    `"DMCP Submission Reviewer 1" <dmcp-submission-reviewer.1@example.com>`,
    `"DMCP Submission Reviewer 2" <dmcp-submission-reviewer.2@example.com>`,
    `"DMCP Submission Reviewer 3" <dmcp-submission-reviewer.3@example.com>`,
]
