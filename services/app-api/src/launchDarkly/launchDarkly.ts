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
    ) => Promise<FlagValueTypes>
}

function ldService(ldClient: LDClient): LDService {
    return {
        getFeatureFlag: async (user, flag) => {
            const context = {
                kind: 'user',
                key: user.email,
            }
            return await ldClient.variation(flag, context, false)
        },
    }
}

export { ldService }
export type { LDService }
