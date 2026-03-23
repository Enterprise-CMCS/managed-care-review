import { featureFlags } from '@mc-review/common-code'
import * as ld from '@launchdarkly/node-server-sdk'

type FlagValue = boolean | string | number | null

type FlagDefaults = Record<string, FlagValue>

// Build defaults from the common-code source of truth
function buildDefaults(): FlagDefaults {
    const defaults: FlagDefaults = {}
    for (const config of Object.values(featureFlags)) {
        defaults[config.flag] = config.defaultValue ?? null
    }
    return defaults
}

const flagDefaults = buildDefaults()
const flags = new Map<string, FlagValue>(Object.entries(flagDefaults))

// Fetch initial flag values from real LaunchDarkly using the server SDK,
// fall back to flags.ts defaults if connection fails
async function initFromLaunchDarkly(): Promise<void> {
    const ldSDKKey = process.env.LD_SDK_KEY
    if (!ldSDKKey || ldSDKKey === 'this-value-must-be-set-in-local') {
        console.info('No real LD_SDK_KEY configured, using flags.ts defaults')
        return
    }

    const ldOptions: ld.LDOptions = {
        streamUri: 'https://stream.launchdarkly.us',
        baseUri: 'https://app.launchdarkly.us',
        eventsUri: 'https://events.launchdarkly.us',
    }

    const ldClient = ld.init(ldSDKKey, ldOptions)

    try {
        console.info('Fetching initial flag values from LaunchDarkly...')
        await ldClient.waitForInitialization({ timeout: 10 })

        const context: ld.LDContext = { kind: 'user', key: 'local-dev-user' }
        let updated = 0
        for (const flagKey of flags.keys()) {
            const defaultVal = flagDefaults[flagKey]
            const value = await ldClient.variation(flagKey, context, defaultVal)
            flags.set(flagKey, value)
            updated++
        }

        console.info(`Loaded ${updated} flag values from LaunchDarkly`)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(
            'Could not connect to LaunchDarkly, using flags.ts defaults:',
            message.replace(ldSDKKey, '***')
        )
    } finally {
        await ldClient.close()
    }
}

function getAll(): Record<string, FlagValue> {
    return Object.fromEntries(flags)
}

function getDefaults(): FlagDefaults {
    return { ...flagDefaults }
}

function has(key: string): boolean {
    return flags.has(key)
}

function set(key: string, value: FlagValue): void {
    flags.set(key, value)
}

function resetAll(): void {
    for (const [key, value] of Object.entries(flagDefaults)) {
        flags.set(key, value)
    }
}

export { getAll, getDefaults, has, set, resetAll, initFromLaunchDarkly }
export type { FlagValue }
