import { statePrograms } from '@managed-care-review/common-code/data'
import { ProgramType } from '../../domain-models'

// Currently relies on state programs json; does not query postgres
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
