import { UserType } from '../domain-models'
import {
    FeatureFlagTypes,
    FlagValueTypes,
} from '../../../app-web/src/common-code/featureFlags'
import { LDClient } from 'launchdarkly-node-server-sdk'

type LDService = {
    getFeatureFlag: (
        user: UserType,
        flag: FeatureFlagTypes
    ) => Promise<FlagValueTypes> | Error
}

function ldService(ldClient: LDClient): LDService {
    return {
        getFeatureFlag: async (user, flag) => {
            const context = {
                kind: 'user',
                key: user.email,
            }
            // defaultValue here is set as undefined because errors in fetching LD flag will return
            // the defaultValue. If a fetch fails and if defaultValue set to a valid FlagValueTypes, then the resolver
            // will treat it as a valid flag state.
            // We do not want this because we want to be able to throw an error so the resolver can handle what to do next.
            const value = await ldClient.variation(flag, context, undefined)
            //If value is undefined we want to return an error.
            if (value === undefined) {
                return new Error('flag value is undefined')
            }
            return value
        },
    }
}

export { ldService }
export type { LDService }
