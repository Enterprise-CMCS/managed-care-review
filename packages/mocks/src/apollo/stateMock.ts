import { typedStatePrograms } from '@mc-review/submissions'
import { State } from '../gen/gqlClient'

function mockStateData(stateCode: string): State {
    const stateData = typedStatePrograms.states.find(
        (state) => state.code === stateCode
    )

    if (!stateData) {
        throw new Error(
            `Can't find state data for state code: ${stateCode}`
        )
    }

    return {
        name: stateData.name,
        code: stateData.code,
        programs: stateData.programs.map((p) => ({
            ...p,
            deprecatedByProgramId: p.deprecatedByProgramId ?? null,
        })),
    }
}

function mockMNState(): State {
    return mockStateData('MN')
}

export { mockMNState, mockStateData }
