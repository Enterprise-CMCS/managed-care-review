import { getParameterStore } from '../../awsParameterStore'

export const getCmsReviewHelpEmail = async (): Promise<string | Error> => {
    const name = `/configuration/email/reviewHelpAddress`
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

export const getCmsReviewHelpEmailLocal = async (): Promise<string | Error> =>
    `"Contract Related Help" <contract.help@example.com>`
