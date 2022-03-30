import { ProgramT } from '../../app-web/src/common-code/domain-models'
import statePrograms from '../data/statePrograms.json'

function findPrograms(
    stateCode: string,
    programIDs: string[]
): ProgramT[] | undefined {
    const programs = statePrograms.states
        .find((state) => state.code === stateCode)
        ?.programs.filter((program) => programIDs.includes(program.id))

    return programs
}

export { findPrograms }
