import { ParameterStore } from '../../awsParameterStore'

export const getSourceEmail = async (): Promise<string | Error> => {
    const name = `/configuration/email/sourceAddress`
    const sourceAddress = await ParameterStore.getParameter(name)

    if (sourceAddress instanceof Error) {
        return sourceAddress
    }

    const { type, value } = sourceAddress

    if (type !== 'String') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    return value.trim()
}

export const getSourceEmailLocal = async (): Promise<string | Error> =>
    `"MC-Review CMS HHS" <local@example.com>`
