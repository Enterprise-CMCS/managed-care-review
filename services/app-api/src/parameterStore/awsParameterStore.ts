import { SSM } from 'aws-sdk'

type GetParameterResult = SSM.GetParameterResult
type ParameterStoreType = { value: string; type: string } | Error

const ssm = new SSM({ region: 'us-east-1' })

const getParameterStore = async (name: string): Promise<ParameterStoreType> => {
    const params = {
        Name: name,
    }

    try {
        const { Parameter: parameter }: GetParameterResult = await ssm
            .getParameter(params)
            .promise()

        if (!parameter || !parameter.Value || !parameter.Type) {
            let errorMessage: string
            if (!parameter) {
                errorMessage = `Failed to return parameter store ${name} data was undefined.`
            } else {
                errorMessage = `Failed to return parameter store ${name}. Value: ${!parameter.Value} or Type: ${!parameter.Type} was undefined.`
            }
            return new Error(errorMessage)
        }

        return {
            value: parameter.Value,
            type: parameter.Type,
        }
    } catch (err) {
        console.error(
            `Failed to fetch parameter ${name}. Error: ${err.message}`
        )
        return new Error(err)
    }
}

export { getParameterStore }
