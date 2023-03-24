import {
    SSMClient,
    GetParameterCommand,
    GetParametersCommand,
} from '@aws-sdk/client-ssm'

export type ParameterType = { value: string; type: string } | Error
export type ParametersType =
    | { name: string; value: string; type: string }[]
    | Error

const ssm = new SSMClient({ region: 'us-east-1' })

type ParameterStoreType = {
    getParameter: (name: string) => Promise<ParameterType>
    getParameters: (names: string[]) => Promise<ParametersType>
}

// Used for email settings
const getParameters = async (names: string[]): Promise<ParametersType> => {
    const command = new GetParametersCommand({
        Names: names,
    })

    try {
        const { Parameters: parameters } = await ssm.send(command)

        if (!parameters || parameters.length === 0) {
            return new Error(
                `Failed to return parameters for ${names} data was undefined or empty.`
            )
        }

        const parametersList: ParametersType = []
        parameters.forEach((param) => {
            if (!param.Value || !param.Type || !param.Name) return
            parametersList.push({
                name: param.Name,
                value: param.Value,
                type: param.Type,
            })
        })
        return parametersList
    } catch (err) {
        console.error(
            `Failed to fetch parameter ${name}. Error: ${err.message}`
        )
        return new Error(err)
    }
}

// Used throughout application to fetch individual parameter store values
const getParameter = async (name: string): Promise<ParameterType> => {
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

const ParameterStore: ParameterStoreType = {
    getParameter: getParameter,
    getParameters: getParameters,
}

export { ParameterStore }
