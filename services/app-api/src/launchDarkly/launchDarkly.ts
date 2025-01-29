import type {
    FlagValue,
    FeatureFlagLDConstant,
    FeatureFlagSettings,
} from '@mc-review/common-code'
import { featureFlagKeys, featureFlags } from '@mc-review/common-code'
import type { LDClient } from '@launchdarkly/node-server-sdk'
import { v4 as uuidv4 } from 'uuid'
import { logError } from '../logger'
import { setErrorAttributesOnActiveSpan } from '../resolvers/attributeHelper'
import type { Span } from '@opentelemetry/api'

//Set up default feature flag values used to returned data
const defaultFeatureFlags = (): FeatureFlagSettings =>
    featureFlagKeys.reduce((a, c) => {
        const flag = featureFlags[c].flag
        const defaultValue = featureFlags[c].defaultValue
        return Object.assign(a, { [flag]: defaultValue })
    }, {} as FeatureFlagSettings)

type LDServiceArgType = {
    key: string
    flag: FeatureFlagLDConstant
    kind?: string
    span?: Span
    anonymous?: boolean
}

type LDService = {
    getFeatureFlag: (args: LDServiceArgType) => Promise<FlagValue | undefined>
    allFlags: (
        args: Omit<LDServiceArgType, 'flag'>
    ) => Promise<FeatureFlagSettings | undefined>
}

function ldService(ldClient: LDClient): LDService {
    return {
        getFeatureFlag: async (args) => {
            const {kind, key, anonymous} = args
            const ldContext = {
                kind: kind ?? 'user',
                key,
                anonymous // https://docs.launchdarkly.com/sdk/features/anonymou
            }
            return await ldClient.variation(args.flag, ldContext, false)
        },
        allFlags: async (args) => {
            const ldContext = {
                kind: args.kind ?? 'user',
                key: args.key,
            }
            const state = await ldClient.allFlagsState(ldContext)
            return state.allValues()
        },
    }
}

function offlineLDService(): LDService {
    return {
        getFeatureFlag: async (args) => {
            logError(
                'getFeatureFlag',
                `No connection to LaunchDarkly, fallback to offlineLDService with default value for ${args.flag}`
            )
            setErrorAttributesOnActiveSpan(
                `No connection to LaunchDarkly, fallback to offlineLDService with default value for ${args.flag}`,
                args.span
            )
            const featureFlags = defaultFeatureFlags()
            return featureFlags[args.flag]
        },
        allFlags: async (args) => {
            logError(
                'allFlags',
                `No connection to LaunchDarkly, fallback to offlineLDService with default values`
            )
            setErrorAttributesOnActiveSpan(
                `No connection to LaunchDarkly, fallback to offlineLDService with default values`,
                args.span
            )
            return defaultFeatureFlags()
        },
    }
}

export { ldService, offlineLDService, defaultFeatureFlags }
export type { LDService, FeatureFlagSettings }
