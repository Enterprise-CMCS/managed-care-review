import { getParameterStore } from '../../awsParameterStore'

export const getCmsRateHelpEmail = async (): Promise<string | Error> => {
    const name = `/configuration/email/rateHelpAddress`
    const reviewHelpAddress = await getParameterStore(name)

    if (reviewHelpAddress instanceof Error) {
        return reviewHelpAddress
    }

    const { type, value } = reviewHelpAddress

    if (type !== 'String') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    return value.trim()
}

export const getCmsRateHelpEmailLocal = async (): Promise<string | Error> =>
    `"Rate Related Help" <rate.help@example.com>`
