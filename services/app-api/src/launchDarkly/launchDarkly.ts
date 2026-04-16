import type {
    FlagValue,
    FeatureFlagLDConstant,
    FeatureFlagSettings,
} from '@mc-review/common-code'
import { featureFlagKeys, featureFlags } from '@mc-review/common-code'
import type { LDClient } from '@launchdarkly/node-server-sdk'
import { logError } from '../logger'
import { setErrorAttributesOnActiveSpan } from '../resolvers/attributeHelper'
import type { Span } from '@opentelemetry/api'
import { parseErrorToError } from '@mc-review/helpers'

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
    kind?: string // usually user specific data form apollo context
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
            const { kind, key, anonymous } = args
            const ldContext = {
                kind: kind ?? 'user',
                key,
                anonymous, // https://docs.launchdarkly.com/sdk/features/anonymou
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

// Launch Darkly service for local deployments. Visit the UI using http://localhost:3031/
function localLDService(baseUrl: string): LDService {
    const flagsUrl = `${baseUrl}/flags`
    return {
        getFeatureFlag: async (args) => {
            try {
                const response = await fetch(flagsUrl)
                if (!response.ok) {
                    console.warn(
                        `localLDService: failed to fetch flag ${args.flag}, using default: Error:${response.status} ${response.statusText}`
                    )
                    return defaultFeatureFlags()[args.flag]
                }
                const flags = (await response.json()) as FeatureFlagSettings
                return flags[args.flag] ?? defaultFeatureFlags()[args.flag]
            } catch (err) {
                console.warn(
                    `localLDService: failed to fetch flag ${args.flag}, using default: Error:${parseErrorToError(err).message}`
                )
                return defaultFeatureFlags()[args.flag]
            }
        },
        allFlags: async () => {
            try {
                const response = await fetch(flagsUrl)
                if (!response.ok) {
                    console.warn(
                        `localLDService: failed to fetch flags, using defaults: Error:${response.status} ${response.statusText}`
                    )
                    return defaultFeatureFlags()
                }
                return (await response.json()) as FeatureFlagSettings
            } catch (err) {
                console.warn(
                    `localLDService: failed to fetch flags, using defaults: Error:${parseErrorToError(err).message}`
                )
                return defaultFeatureFlags()
            }
        },
    }
}

export { ldService, offlineLDService, localLDService, defaultFeatureFlags }
export type { LDService, FeatureFlagSettings }
