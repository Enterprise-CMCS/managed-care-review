import { RateType } from "@prisma/client"
import { isAdminUser, isCMSUser } from "../../domain-models"
import { StoreError } from "../../postgres"
import { setResolverDetailsOnActiveSpan } from "../attributeHelper"

export function indexRatesResolver(
    store: Store,
): QueryResolvers['indexRatess'] {
    return async (_parent, _args, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('indexRates', user, span)

        if (
            isCMSUser(user) ||
            isAdminUser(user) ||
            isHelpdeskUser(user)
        ) {
            let results: StoreError | RateType[] = []
                results = await store.findAllHealthPlanPackagesBySubmittedAt()
            }

            return validateAndReturnRates(results, span)
        } else {
            const errMsg = 'user not authorized to fetch state data'
            logError('indexHealthPlanPackages', errMsg)
            setErrorAttributesOnActiveSpan(errMsg, span)
            throw new ForbiddenError(errMsg)
        }
    }
}