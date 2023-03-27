import { ParameterStore } from '../../awsParameterStore'

export const getCmsDevTeamHelpEmail = async (): Promise<string | Error> => {
    const name = `/configuration/email/devTeamHelpAddress`
    const reviewHelpAddress = await ParameterStore.getParameter(name)

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

export const getCmsDevTeamHelpEmailLocal = async (): Promise<string | Error> =>
    `"MC-Review Support" <mc-review@example.com>`
