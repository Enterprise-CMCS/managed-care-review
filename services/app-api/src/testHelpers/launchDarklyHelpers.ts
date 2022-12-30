import { LDService } from '../launchDarkly/launchDarkly'
import {
    featureFlags,
    featureFlagEnums,
    FeatureFlagTypes,
    FlagValueTypes,
} from 'app-web/src/common-code/featureFlags'

type FeatureFlagObject = Record<FeatureFlagTypes, FlagValueTypes>

//Set up default feature flag values used to returned data
const defaultFeatureFlags: FeatureFlagObject = featureFlagEnums.reduce(
    (a, c) => {
        const flag = featureFlags[c].flag
        const defaultValue = featureFlags[c].defaultValue
        return Object.assign(a, { [flag]: defaultValue })
    },
    {} as FeatureFlagObject
)

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
