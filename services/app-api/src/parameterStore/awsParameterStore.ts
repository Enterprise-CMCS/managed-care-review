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

// Used for email settings. Must fetch parameters in batches of 10.
const getParameters = async (names: string[]): Promise<ParametersType> => {
    const getParametersSSMCommand = async (validNamesList: string[]) => {
        const command = new GetParametersCommand({
            Names: validNamesList,
        })

        try {
            const {
                Parameters: parameters,
                InvalidParameters: invalidParameters,
                $metadata: metadata,
            } = await ssm.send(command)

            if (!parameters || parameters.length === 0) {
                return [] // not an error state, just return empty array for none found
            }

            if (invalidParameters) {
                console.error(
                    `GetParameters: Invalid parameters: ${invalidParameters}.  Metadata: ${JSON.stringify(
                        metadata
                    )}`
                )
            }

            const parametersList: ParametersType = []
            parameters.forEach((param) => {
                console.info('PARAM check:', JSON.stringify(param))
                if (!param.Value || !param.Type || !param.Name) {
                    console.info('PARAM check: missing expected values')
                    return
                }

                parametersList.push({
                    name: param.Name,
                    value: param.Value,
                    type: param.Type,
                })
            })
            console.info(`GetParameters: return valid params ${parametersList}`)
            return parametersList
        } catch (err) {
            console.error(
                `GetParameters: Failed to fetch parameters: ${names}. Error: ${err.message}`
            )
            return new Error(err) // Future refactor: make ParameterStoreError
        }
    }

    // MAIN
    if (names.length <= 10) {
        return await getParametersSSMCommand(names)
    } else {
        const maxSize = 10
        const finalParametersList: {
            name: string
            value: string
            type: string
        }[] = []
        const finalErrorsList: Error[] = []
        for (let i = 0; i < names.length; i += maxSize) {
            const namesChunk = names.slice(i, i + maxSize)

            const result = await getParametersSSMCommand(namesChunk)

            if (result instanceof Error) {
                finalErrorsList.push(result)
            } else {
                finalParametersList.concat(result)
            }
        }
        return finalParametersList
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
            `GetParameter: Failed to fetch parameter ${name}. Error: ${err.message}`
        )
        return new Error(err) // Future refactor: make ParameterStoreError
    }
}

const ParameterStore: ParameterStoreType = {
    getParameter: getParameter,
    getParameters: getParameters,
}

export { ParameterStore }
