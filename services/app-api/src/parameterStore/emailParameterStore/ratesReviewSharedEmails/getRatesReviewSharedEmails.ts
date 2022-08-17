import { getParameterStore } from '../../awsParameterStore'

export const getRatesReviewSharedEmails = async (): Promise<
    string[] | string | Error
> => {
    return await getParameterStore(`/configuration/email/ratesAddresses`)
}

export const getRatesReviewSharedEmailsLocal = async (): Promise<
    string[] | Error
> => [
    `"Rate Submission Reviewer 1" <rate.reviewer.1@example.com>`,
    `"Rate Submission Reviewer 2" <rate.reviewer.2@example.com>`,
    `"Rate Submission Reviewer 3" <rate.reviewer.3@example.com>`,
]
