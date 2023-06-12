import { ParameterStore } from '../../awsParameterStore'

export const getDevReviewTeamEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/reviewTeamAddresses`
    const reviewTeamAddresses = await ParameterStore.getParameter(name)

    if (reviewTeamAddresses instanceof Error) {
        return reviewTeamAddresses
    }

    const { type, value } = reviewTeamAddresses

    if (type !== 'StringList') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    //Split string into array using ',' separator and trim each array item.
    return value.split(',').map((email) => email.trim())
}

export const getDevReviewTeamEmailsLocal = async (): Promise<
    string[] | Error
> => [
    `"Dev Reviewer 1" <Dev.reviewer.1@example.com>`,
    `"Dev Reviewer 2" <Dev.reviewer.2@example.com>`,
    `"Dev Reviewer 3" <Dev.reviewer.3@example.com>`,
]
