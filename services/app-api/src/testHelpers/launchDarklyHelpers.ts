import type {
    FeatureFlagLDConstant,
    FeatureFlagSettings,
} from '@mc-review/common-code'
import {
    defaultFeatureFlags,
    type LDService,
} from '../launchDarkly/launchDarkly'

function testLDService(mockFeatureFlags?: FeatureFlagSettings): LDService {
    const featureFlags = defaultFeatureFlags()

    //Update featureFlags with mock flag values.
    if (mockFeatureFlags) {
        for (const flag in mockFeatureFlags) {
            const featureFlag = flag as FeatureFlagLDConstant
            featureFlags[featureFlag] = mockFeatureFlags[
                featureFlag
            ] as FeatureFlagSettings
        }
    }

    return {
        getFeatureFlag: async ({ flag }) => featureFlags[flag],
        allFlags: async () => featureFlags,
    }
}

export { testLDService }
