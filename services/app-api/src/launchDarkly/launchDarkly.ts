import type {
    FlagValue,
    FeatureFlagLDConstant,
    FeatureFlagSettings,
} from '../../../app-web/src/common-code/featureFlags'
import {
    featureFlagKeys,
    featureFlags,
} from '../../../app-web/src/common-code/featureFlags'
import type { LDClient } from '@launchdarkly/node-server-sdk'
import type { Context } from '../handlers/apollo_gql'
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
    allFlags: (context: Context) => Promise<FeatureFlagSettings | undefined>
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
        allFlags: async (context) => {
            const ldContext = {
                kind: 'user',
                key: context.user.email,
            }
            const state = await ldClient.allFlagsState(ldContext)
            return state.allValues()
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
        allFlags: async (context) => {
            logError(
                'allFlags',
                `No connection to LaunchDarkly, fallback to offlineLDService with default values`
            )
            setErrorAttributesOnActiveSpan(
                `No connection to LaunchDarkly, fallback to offlineLDService with default values`,
                context.span
            )
            return defaultFeatureFlags()
        },
    }
}

export { ldService, offlineLDService, defaultFeatureFlags }
export type { LDService, FeatureFlagSettings }
