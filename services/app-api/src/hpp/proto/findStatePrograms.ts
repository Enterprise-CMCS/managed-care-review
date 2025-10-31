import statePrograms from './statePrograms.json'
import type {
    StateType,
    ProgramArgType,
    StatePrograms,
} from '../healthPlanFormDataType'

const typedStatePrograms: StatePrograms = statePrograms

export const findStatePrograms = (stateCode: string): ProgramArgType[] => {
    const programs = typedStatePrograms.states.find(
        (state) => state.code === stateCode
    )?.programs

    if (!programs) {
        return []
    }
    return programs
}

export type { ProgramArgType, StateType, StatePrograms }
