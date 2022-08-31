import { getParameterStore } from '../../awsParameterStore'

export const getCmsReviewSharedEmails = async (): Promise<string[] | Error> => {
    const name = `/configuration/email/reviewTeamAddresses`
    const reviewTeamAddresses = await getParameterStore(name)

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

export const getCmsReviewSharedEmailsLocal = async (): Promise<
    string[] | Error
> => [
    `"CMS Reviewer 1" <CMS.reviewer.1@example.com>`,
    `"CMS Reviewer 2" <CMS.reviewer.2@example.com>`,
    `"CMS Reviewer 3" <CMS.reviewer.3@example.com>`,
]
