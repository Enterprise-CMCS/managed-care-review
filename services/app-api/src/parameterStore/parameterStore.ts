import { SSM } from 'aws-sdk'
import { logError } from '../logger'
import { setErrorAttributesOnActiveSpan } from '../resolvers/attributeHelper'
import { Context } from '../handlers/apollo_gql'

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
        return new Error(err)
    }
}

const getStateAnalystEmailsStore = async (
    stateCode: string,
    span: Context['span'],
    operation: string
): Promise<string[]> => {
    const analystsParameterStore = await getParameterStore(
        `/configuration/${stateCode}/stateanalysts/email`
    )
    if (analystsParameterStore instanceof Error) {
        logError(operation, analystsParameterStore.message)
        setErrorAttributesOnActiveSpan(analystsParameterStore.message, span)
        return []
    } else {
        return analystsParameterStore.split(',')
    }
}

export { getParameterStore, getStateAnalystEmailsStore }
