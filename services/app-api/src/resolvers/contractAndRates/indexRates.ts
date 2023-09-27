import { ForbiddenError } from "apollo-server-core"
import type { Span } from "@opentelemetry/api"

import { isAdminUser, isCMSUser } from "../../domain-models"
import { setErrorAttributesOnActiveSpan, setResolverDetailsOnActiveSpan, setSuccessAttributesOnActiveSpan } from "../attributeHelper"
import { isHelpdeskUser } from "../../domain-models/user"
import { isStoreError } from "../../postgres"
import type { QueryResolvers } from "../../gen/gqlServer"
import type  { LDService } from "../../launchDarkly/launchDarkly"
import type  { RateType } from "../../domain-models/contractAndRates"
import type { Store, StoreError } from "../../postgres"


const validateAndReturnRates = (
    results: RateType[] | StoreError,
    span?: Span
) => {
    if (isStoreError(results)) {
        const errMessage = `Issue indexing rates of type ${results.code}. Message: ${results.message}`
        setErrorAttributesOnActiveSpan(errMessage, span)
        throw new Error(errMessage)
    }

    const edges = results.map((rate) => {
        return {
            node: {
                ...rate,
            },
        }
    })
    setSuccessAttributesOnActiveSpan(span)
    return { totalCount: edges.length, edges }
}

export function indexRatesResolver(
    store: Store,
    launchDarkly: LDService
): QueryResolvers['indexRates'] {
    return async (_parent, _args, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('indexRates', user, span)
        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )

        if(!ratesDatabaseRefactor) {
            throw new ForbiddenError('indexRates must be used with rates database refactor flag')
        }

        if (
            isCMSUser(user) ||
            isAdminUser(user) ||
            isHelpdeskUser(user)
        ) {
            let results: StoreError | RateType[] = []
                results = await store.findAllRatesWithHistoryBySubmitInfo()

            return validateAndReturnRates(results, span)
        } else {
            const errMsg = 'user not authorized to fetch state data'
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}