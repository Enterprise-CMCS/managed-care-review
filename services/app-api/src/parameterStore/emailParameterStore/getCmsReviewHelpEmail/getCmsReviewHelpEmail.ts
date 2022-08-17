import { getParameterStore } from '../../awsParameterStore'

export const getCmsReviewHelpEmail = async (): Promise<
    string[] | string | Error
> => {
    return getParameterStore(`/configuration/email/reviewHelpAddress`)
}

export const getCmsReviewHelpEmailLocal = async (): Promise<string | Error> =>
    `"CMS Review Help" <CMS.review.help@example.com>`
