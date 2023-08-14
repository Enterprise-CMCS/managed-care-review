import type { ParameterType } from '../awsParameterStore'

const validateAndReturnValueArray = (
    storeResponse: ParameterType,
    name: string
): Error | string[] => {
    if (storeResponse instanceof Error) {
        return storeResponse
    }

    const { type, value } = storeResponse
    if (type !== 'StringList') {
        const errorMessage = `Parameter store ${name} value of Type ${type} is not supported`
        return new Error(errorMessage)
    }

    //Split string into array using ',' separator and trim each array item.
    const stringArray = value.split(',').map((email) => email.trim())

    if (stringArray.length === 0) {
        const errorMessage = `Parameter store ${name} has an empty value`
        return new Error(errorMessage)
    }
    return stringArray
}

export { validateAndReturnValueArray }
