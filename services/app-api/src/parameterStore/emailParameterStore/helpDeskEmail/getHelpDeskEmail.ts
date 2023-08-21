import { ParameterStore } from '../../awsParameterStore'

export const getHelpDeskEmail = async (): Promise<string | Error> => {
    const name = `/configuration/email/helpDeskAddress`
    const helpDeskAddress = await ParameterStore.getParameter(name)

    if (helpDeskAddress instanceof Error) {
        return helpDeskAddress
    }

    const { type, value } = helpDeskAddress

    if (type !== 'String') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    return value.trim()
}

export const getHelpDeskEmailLocal = async (): Promise<string | Error> =>
    `"MC-Review Help Desk" <MC_Review_HelpDesk@example.com>`
