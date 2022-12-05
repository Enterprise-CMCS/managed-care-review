import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'

type ParameterStoreType = { value: string; type: string } | Error

const ssm = new SSMClient({ region: 'us-east-1' })

const getParameterStore = async (name: string): Promise<ParameterStoreType> => {
    const command = new GetParameterCommand({
        Name: name,
    })

    try {
        const { Parameter: parameter } = await ssm.send(command)

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
