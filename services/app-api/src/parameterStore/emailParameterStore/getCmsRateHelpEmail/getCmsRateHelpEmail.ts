import { getParameterStore } from '../../awsParameterStore'

export const getCmsRateHelpEmail = async (): Promise<
    string[] | string | Error
> => {
    return await getParameterStore(`/configuration/email/rateHelpAddress`)
}

export const getCmsRateHelpEmailLocal = async (): Promise<string | Error> =>
    `"CMS Rate Help" <CMS.rate.help@example.com>`
