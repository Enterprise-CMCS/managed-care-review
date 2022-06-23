import { SSM } from 'aws-sdk'

type GetParameterResult = SSM.GetParameterResult

const getParameterStore = async (name: string): Promise<string | Error> => {
    const ssm = new SSM({ region: 'us-east-1' })

    const params = {
        Name: name,
    }

    try {
        const response: GetParameterResult = await ssm
            .getParameter(params)
            .promise()
        const value = response?.Parameter?.Value

        if (value === undefined) {
            const errorMessage = `Failed to return parameter ${name}. Value was undefined.`
            console.error(errorMessage)
            return new Error(errorMessage)
        }

        return value
    } catch (err) {
        console.error(
            `Failed to fetch parameter ${name}. Error: ${err.message}`
        )
        return err
    }
}

export { getParameterStore }
