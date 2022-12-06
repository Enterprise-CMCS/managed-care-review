import statePrograms from '../data/statePrograms.json'
import { ProgramType } from '../domain-models'

function findStatePrograms(stateCode: string): ProgramType[] | Error {
    const programs = statePrograms.states.find(
        (state) => state.code === stateCode
    )?.programs

    if (!programs) {
        const errMessage = `Can't find programs for state ${stateCode}`
        return new Error(errMessage)
    }

    return programs
}

export { findStatePrograms }
