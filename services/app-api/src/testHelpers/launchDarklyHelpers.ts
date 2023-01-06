import { LDService } from '../launchDarkly/launchDarkly'
import {
    FeatureFlagTypes,
    FlagValueTypes,
} from 'app-web/src/common-code/featureFlags'

import {
    defaultFeatureFlags,
    FeatureFlagObject,
} from '../launchDarkly/launchDarkly'

function testLDService(
    mockFeatureFlags?: Partial<FeatureFlagObject>
): LDService {
    const featureFlags = defaultFeatureFlags

    //Update featureFlags with mock flag values.
    if (mockFeatureFlags) {
        for (const flag in mockFeatureFlags) {
            const featureFlag = flag as FeatureFlagTypes
            featureFlags[featureFlag] = mockFeatureFlags[
                featureFlag
            ] as FlagValueTypes
        }
    }

    return {
        getFeatureFlag: async (user, flag) => featureFlags[flag],
    }
}

export { testLDService }
