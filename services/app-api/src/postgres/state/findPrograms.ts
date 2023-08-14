import type { ProgramType } from '../../domain-models'
import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'

// Currently relies on state programs json; does not query postgres
function findPrograms(
    stateCode: string,
    programIDs: string[]
): ProgramType[] | Error {
    const programs = statePrograms.states
        .find((state) => state.code === stateCode)
        ?.programs.filter((program) => programIDs.includes(program.id))

    if (!programs || programIDs.length !== programs.length) {
        const errMessage = `Can't find programs ${programIDs} from state ${stateCode}`
        return new Error(errMessage)
    }

    return programs
}

export { findPrograms }
