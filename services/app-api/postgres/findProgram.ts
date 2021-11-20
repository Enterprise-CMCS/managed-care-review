import { ProgramT } from '../../app-web/src/common-code/domain-models'
import statePrograms from '../data/statePrograms.json'

function findProgram(
    stateCode: string,
    programID: string
): ProgramT | undefined {
    const program = statePrograms.states
        .find((state) => state.code === stateCode)
        ?.programs.find((program) => program.id == programID)

    return program
}

export { findProgram }
