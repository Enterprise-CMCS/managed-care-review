import { getParameterStore } from '../../awsParameterStore'

export const getCmsReviewSharedEmails = async (): Promise<string[] | Error> => {
    const reviewTeamAddresses = await getParameterStore(
        `/configuration/email/reviewTeamAddresses`
    )
    if (reviewTeamAddresses instanceof Error) {
        return reviewTeamAddresses
    } else {
        //Split string into array using ',' separator and trim each array item.
        return reviewTeamAddresses.split(',').map((email) => email.trim())
    }
}

export const getCmsReviewSharedEmailsLocal = async (): Promise<
    string[] | Error
> => [
    `CMS Reviewer 1" <CMS.reviewer.1@example.com>`,
    `"CMS Reviewer 2" <CMS.reviewer.2@example.com>`,
    `"CMS Reviewer 3" <CMS.reviewer.3@example.com>`,
]
