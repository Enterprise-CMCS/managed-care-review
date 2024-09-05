import { typedStatePrograms } from '@mc-review/hpp'
import type { ProgramType } from '../../domain-models'

// Currently relies on state programs json; does not query postgres
function findStatePrograms(stateCode: string): ProgramType[] | Error {
    const programs = typedStatePrograms.states.find(
        (state) => state.code === stateCode
    )?.programs

    if (!programs) {
        const errMessage = `Can't find programs for state ${stateCode}`
        return new Error(errMessage)
    }

    return programs
}

export { findStatePrograms }
