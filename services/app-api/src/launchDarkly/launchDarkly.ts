import {
    featureFlagKeys,
    featureFlags,
    FlagValue,
    FeatureFlagLDConstant,
    FeatureFlagSettings,
} from '../../../app-web/src/common-code/featureFlags'
import { LDClient } from '@launchdarkly/node-server-sdk'
import { Context } from '../handlers/apollo_gql'
import { logError } from '../logger'
import { setErrorAttributesOnActiveSpan } from '../resolvers/attributeHelper'

//Set up default feature flag values used to returned data
const defaultFeatureFlags = (): FeatureFlagSettings =>
    featureFlagKeys.reduce((a, c) => {
        const flag = featureFlags[c].flag
        const defaultValue = featureFlags[c].defaultValue
        return Object.assign(a, { [flag]: defaultValue })
    }, {} as FeatureFlagSettings)

type LDService = {
    getFeatureFlag: (
        context: Context,
        flag: FeatureFlagLDConstant
    ) => Promise<FlagValue | undefined>
}

function ldService(ldClient: LDClient): LDService {
    return {
        getFeatureFlag: async (context, flag) => {
            const ldContext = {
                kind: 'user',
                key: context.user.email,
            }
            return await ldClient.variation(flag, ldContext, false)
        },
    }
}

function offlineLDService(): LDService {
    return {
        getFeatureFlag: async (context, flag) => {
            logError(
                'getFeatureFlag',
                `No connection to LaunchDarkly, fallback to offlineLDService with default value for ${flag}`
            )
            setErrorAttributesOnActiveSpan(
                `No connection to LaunchDarkly, fallback to offlineLDService with default value for ${flag}`,
                context.span
            )
            const featureFlags = defaultFeatureFlags()
            return featureFlags[flag]
        },
    }
}

export { ldService, offlineLDService, defaultFeatureFlags }
export type { LDService, FeatureFlagSettings }
