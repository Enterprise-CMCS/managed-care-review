import { SSM } from 'aws-sdk'

type GetParameterResult = SSM.GetParameterResult
export type ParameterStoreEmailsType = string[] | string | Error

const ssm = new SSM({ region: 'us-east-1' })

const getParameterStore = async (
    name: string
): Promise<ParameterStoreEmailsType> => {
    const params = {
        Name: name,
    }

    try {
        const response: GetParameterResult = await ssm
            .getParameter(params)
            .promise()
        const Value = response?.Parameter?.Value
        const Type = response?.Parameter?.Value

        if (Value === undefined || Type === undefined) {
            const errorMessage = `Failed to return parameter ${name}. Value or Type was undefined.`
            console.error(errorMessage)
            return new Error(errorMessage)
        }
        if (Type !== 'String' && Type !== 'StringList') {
            const errorMessage = `Failed to return parameter ${name}. Value of Type ${Type} is not supported`
            console.error(errorMessage)
            return new Error(errorMessage)
        }

        if (Type === 'StringList') {
            //Split string into array using ',' separator and trim each array item.
            return Value.split(',').map((email) => email.trim())
        } else {
            return Value
        }
    } catch (err) {
        console.error(
            `Failed to fetch parameter ${name}. Error: ${err.message}`
        )
        return new Error(err)
    }
}

export { getParameterStore }
