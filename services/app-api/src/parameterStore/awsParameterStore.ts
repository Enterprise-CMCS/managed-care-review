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
            } = await ssm.send(command)

            if (!parameters || parameters.length === 0) {
                return [] // not an error state, just return empty array for none found
            }

            if (invalidParameters) {
                console.info(
                    `GetParameters: Invalid parameters, state analyst config not found: ${invalidParameters}.`
                )
            }

            const parametersList: ParametersType = []
            parameters.forEach((param) => {
                if (!param.Value || !param.Type || !param.Name) {
                    console.info(
                        `GetParameters: Param fetched but missing expected values ${JSON.stringify(
                            param
                        )}`
                    )
                    return
                }
                const constructedParam = {
                    name: param.Name,
                    value: param.Value,
                    type: param.Type,
                }
                parametersList.push(constructedParam)
            })
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
        let finalParametersList: {
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
                finalParametersList = finalParametersList.concat(result)
            }
        }
        console.info(
            `getParameters: out of ${
                names.length
            } states, returns ${JSON.stringify(finalParametersList)}`
        )
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
