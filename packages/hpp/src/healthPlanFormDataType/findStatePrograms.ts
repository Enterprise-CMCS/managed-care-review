import { typedStatePrograms } from '../data'
import type { ProgramArgType } from './State'

export const findStatePrograms = (stateCode: string): ProgramArgType[] => {
    const programs = typedStatePrograms.states.find(
        (state) => state.code === stateCode
    )?.programs

    if (!programs) {
        return []
    }
    return programs
}
