import { ProgramT } from '../../app-web/src/common-code/domain-models'
import statePrograms from '../data/statePrograms.json'

function findPrograms(
    stateCode: string,
    programIDs: string[]
): ProgramT | undefined {
    const program = statePrograms.states
        .find((state) => state.code === stateCode)
        ?.programs.find((program) => programIDs.includes(program.id))

    return program
}

export { findPrograms }
