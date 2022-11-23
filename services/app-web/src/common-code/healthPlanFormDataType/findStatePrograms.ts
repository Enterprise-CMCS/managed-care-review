import statePrograms from '../data/statePrograms.json'
import { ProgramArgType } from './State'

export const findStatePrograms = (stateCode: string): ProgramArgType[] => {
    const programs = statePrograms.states.find(
        (state) => state.code === stateCode
    )?.programs

    if (!programs) {
        return []
    }
    return programs
}
