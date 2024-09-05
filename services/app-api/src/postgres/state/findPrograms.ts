import type { ProgramType } from '../../domain-models'
import { typedStatePrograms } from '@mc-review/hpp'

// Currently relies on state programs json; does not query postgres
function findPrograms(
    stateCode: string,
    programIDs: string[]
): ProgramType[] | Error {
    const programs = typedStatePrograms.states
        .find((state) => state.code === stateCode)
        ?.programs.filter((program) => programIDs.includes(program.id))

    if (!programs || programIDs.length !== programs.length) {
        const errMessage = `Program(s) in [${programIDs}] are not valid ${stateCode} programs`
        return new Error(errMessage)
    }

    return programs
}

export { findPrograms }
