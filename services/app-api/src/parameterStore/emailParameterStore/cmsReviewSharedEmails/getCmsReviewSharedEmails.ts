import { getParameterStore } from '../../awsParameterStore'

export const getCmsReviewSharedEmails = async (): Promise<
    string[] | string | Error
> => {
    return await getParameterStore(`/configuration/email/reviewTeamAddresses`)
}

export const getCmsReviewSharedEmailsLocal = async (): Promise<
    string[] | Error
> => [
    `"CMS Reviewer 1" <CMS.reviewer.1@example.com>`,
    `"CMS Reviewer 2" <CMS.reviewer.2@example.com>`,
    `"CMS Reviewer 3" <CMS.reviewer.3@example.com>`,
]
