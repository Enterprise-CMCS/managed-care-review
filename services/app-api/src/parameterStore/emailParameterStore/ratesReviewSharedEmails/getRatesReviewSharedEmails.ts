import { getParameterStore } from '../../awsParameterStore'

export const getRatesReviewSharedEmails = async (): Promise<
    string[] | Error
> => {
    const name = `/configuration/email/ratesAddresses`
    const ratesAddresses = await getParameterStore(name)

    if (ratesAddresses instanceof Error) {
        return ratesAddresses
    }

    const { type, value } = ratesAddresses

    if (type !== 'StringList') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    //Split string into array using ',' separator and trim each array item.
    return value.split(',').map((email) => email.trim())
}

export const getRatesReviewSharedEmailsLocal = async (): Promise<
    string[] | Error
> => [
    `"Rate Submission Reviewer 1" <rate.reviewer.1@example.com>`,
    `"Rate Submission Reviewer 2" <rate.reviewer.2@example.com>`,
    `"Rate Submission Reviewer 3" <rate.reviewer.3@example.com>`,
]
