import { ContractPackage, QueryResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { isStoreError, Store } from '../../postgres'
import { ZodContractFormDataTypeV2 } from '../../postgres/contractAndRates/zodDomainTypes'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'

export function fetchContractResolver(
    store: Store
): QueryResolvers['fetchContractPackage'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('fetchHealthPlanPackage', user, span)
        // fetch from the store
        
        const av2: ZodContractFormDataTypeV2 = {
            schemaName: 'contractFormData',
            schemaVersion: 2,

            contractDescription: 'The first version of a contract',
            startDate: '2022-01-01',
            endDate: '2023-01-01',
            submissionType: 'CONTRACT_ONLY',
            federalAuthorities: ['WAIVER_1915B', 'STATE_PLAN'],
            modifiedProvisions: {
                modifiedGeoAreaServed: true,
                modifiedRiskSharingStrategy: false,
            }
        }

        const cPKG: ContractPackage = {
            id: '2',
            stateCode: 'CA',
            status: 'SUBMITTED',

            contractFormData: av2
        }


        logSuccess('fetchHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)
        return { pkg: cPKG }
    }
}
