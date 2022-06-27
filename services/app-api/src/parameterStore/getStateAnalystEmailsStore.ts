import { Context } from '../handlers/apollo_gql'
import { logError } from '../logger'
import { setErrorAttributesOnActiveSpan } from '../resolvers/attributeHelper'
import { getParameterStore } from './parameterStore'

export const getStateAnalystEmailsStore = async (
    stateCode: string,
    span?: Context['span'],
    operation?: string
): Promise<string[]> => {
    const analystsParameterStore = await getParameterStore(
        `/configuration/${stateCode}/stateanalysts/email`
    )
    if (analystsParameterStore instanceof Error) {
        logError(
            operation || 'getStateAnalystEmailsStore',
            analystsParameterStore.message
        )
        setErrorAttributesOnActiveSpan(analystsParameterStore.message, span)
        return []
    } else {
        //Split string into array using ',' separator and trim each array item.
        return analystsParameterStore.split(',').map((email) => email.trim())
    }
}
