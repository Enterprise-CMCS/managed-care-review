import { ProgramT } from '../../app-web/src/common-code/domain-models'
import statePrograms from '../data/statePrograms.json'

function findProgram(
    stateCode: string,
    programIDs: Array<string>
): ProgramT | undefined {
    const program = statePrograms.states
        .find((state) => state.code === stateCode)
        ?.programs.find((program) => programIDs.some((id) => id === program.id))

    return program
}

export { findProgram }
