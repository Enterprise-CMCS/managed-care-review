import { ForbiddenError } from 'apollo-server-lambda'
import type { StateCodeType } from '../../common-code/healthPlanFormDataType'
import type { StateType } from '../../domain-models'
import { hasAdminPermissions, hasCMSPermissions } from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { QueryResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { EmailParameterStore } from '../../parameterStore'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'

export function fetchEmailSettingsResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore
): QueryResolvers['fetchEmailSettings'] {
    return async (_parent, __, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('fetchEmailSettings', {}, ctx)
        setResolverDetailsOnActiveSpan('fetchEmailSettings', user, span)
        if (!hasAdminPermissions(user) && !hasCMSPermissions(user)) {
            const errMessage = 'user not authorized to fetch settings'
            logError('fetchEmailSettings', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        setResolverDetailsOnActiveSpan('fetchEmailSettings', user, span)

        // First get emailer config
        const config = emailer.config

        // Then get list of supported states
        const findAllStatesResult = await store.findAllSupportedStates()

        if (findAllStatesResult instanceof Error) {
            logError('indexUsers', findAllStatesResult.message)
            setErrorAttributesOnActiveSpan(findAllStatesResult.message, span)
            throw new Error('Unexpected Error Querying Users')
        }

        const states: StateType[] = findAllStatesResult
        const stateCodesList = states.map(
            (state) => state.stateCode as StateCodeType
        )
        // Then get state analysts emails for each supported state
        let stateAnalystsEmailsSettings =
            await emailParameterStore.getStateAnalystsSettings(stateCodesList)

        if (stateAnalystsEmailsSettings instanceof Error) {
            logError(
                'getStateAnalystsEmailSettings',
                stateAnalystsEmailsSettings.message
            )
            setErrorAttributesOnActiveSpan(
                stateAnalystsEmailsSettings.message,
                span
            )
            stateAnalystsEmailsSettings = []
        }

        logSuccess('fetchEmailSettings')
        setSuccessAttributesOnActiveSpan(span)
        return { config, stateAnalysts: stateAnalystsEmailsSettings }
    }
}
