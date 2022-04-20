import { ProgramType } from '../domain-models'
import statePrograms from '../data/statePrograms.json'

function findPrograms(
    stateCode: string,
    programIDs: string[]
): ProgramType[] | undefined {
    const programs = statePrograms.states
        .find((state) => state.code === stateCode)
        ?.programs.filter((program) => programIDs.includes(program.id))

    return programs
}

export { findPrograms }
