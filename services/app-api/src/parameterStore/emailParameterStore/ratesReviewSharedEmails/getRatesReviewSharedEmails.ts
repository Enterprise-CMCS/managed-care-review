import { getParameterStore } from '../../awsParameterStore'

export const getRatesReviewSharedEmails = async (): Promise<
    string[] | Error
> => {
    const ratesAddresses = await getParameterStore(
        `/configuration/email/ratesAddresses`
    )
    if (ratesAddresses instanceof Error) {
        return ratesAddresses
    } else {
        //Split string into array using ',' separator and trim each array item.
        return ratesAddresses.split(',').map((email) => email.trim())
    }
}

export const getRatesReviewSharedEmailsLocal = async (): Promise<
    string[] | Error
> => [
    `Rate Submission Reviewer 1" <rate.reviewer.1@example.com>`,
    `"Rate Submission Reviewer 2" <rate.reviewer.2@example.com>`,
    `"Rate Submission Reviewer 3" <rate.reviewer.3@example.com>`,
]
