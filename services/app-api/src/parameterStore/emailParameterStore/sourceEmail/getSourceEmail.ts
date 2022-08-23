import { getParameterStore } from '../../awsParameterStore'

export const getSourceEmail = async (): Promise<string | Error> => {
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

export const getSourceEmailLocal = async (): Promise<string | Error> =>
    `"MC-Review CMS HHS" <local@example.com>`
