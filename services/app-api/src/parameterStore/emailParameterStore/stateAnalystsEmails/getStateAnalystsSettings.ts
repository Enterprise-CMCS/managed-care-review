import type { StateCodeType } from '../../../common-code/healthPlanFormDataType'
import { isValidStateCode } from '../../../common-code/healthPlanFormDataType'
import { ParameterStore } from '../../awsParameterStore'

type StateAnalystsWithState = {
    stateCode: StateCodeType
    emails: string[]
}[]

const getStateAnalystsSettings = async (
    stateCodes: StateCodeType[]
): Promise<StateAnalystsWithState | Error> => {
    const names = stateCodes.map(
        (code) => `/configuration/${code}/stateanalysts/email`
    )
    const stateAnalysts = await ParameterStore.getParameters(names)

    if (stateAnalysts instanceof Error) {
        return stateAnalysts
    }

    // Make sure we are only returning valid states and clean parameter store value
    const cleanedStateAnalysts: StateAnalystsWithState = []

    stateAnalysts.forEach(
        (stateAnalyst: { name: string; value: string; type: string }) => {
            // Format values string into array
            const value = stateAnalyst.value
                .split(',')
                .map((email) => email.trim())

            const stateCode = stateAnalyst.name
                .replace('/configuration/', '')
                .replace('/stateanalysts/email', '')

            if (isValidStateCode(stateCode)) {
                cleanedStateAnalysts.push({
                    stateCode: stateCode,
                    emails: value,
                })
            } else {
                console.error(
                    `getStateAnalystsSettings: invalid state code ${stateCode}`
                )
            }
        }
    )
    return cleanedStateAnalysts
}

const getStateAnalystsSettingsLocal = async (
    stateCodes: StateCodeType[]
): Promise<StateAnalystsWithState | Error> => {
    return [
        {
            stateCode: 'MN',
            emails: [`"MN State Analyst 1" <MNStateAnalyst1@example.com>`],
        },
        {
            stateCode: 'FL',
            emails: [`"FL State Analyst 1" <FLStateAnalyst1@example.com>`],
        },
    ]
}

export { getStateAnalystsSettings, getStateAnalystsSettingsLocal }
export type { StateAnalystsWithState }
