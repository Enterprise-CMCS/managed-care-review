import { ForbiddenError } from 'apollo-server-lambda'
import type { StateCodeType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { StateType } from '../../domain-models'
import {
    isAdminUser,
    isBusinessOwnerUser,
    isHelpdeskUser,
} from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { QueryResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { EmailParameterStore } from '../../parameterStore'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'
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
        const { user, span } = context
        if (
            !(
                isAdminUser(user) ||
                isHelpdeskUser(user) ||
                isBusinessOwnerUser(user)
            )
        ) {
            const errMessage = 'Non-admin user not authorized to fetch settings'
            logError('fetchEmailSettings', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        setResolverDetailsOnActiveSpan('fetchEmailSettings', user, span)

        // First get emailer config
        const config = emailer.config

        // Then get list of supported states
        const findAllStatesResult = await store.findAllSupportedStates()

        if (isStoreError(findAllStatesResult)) {
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
