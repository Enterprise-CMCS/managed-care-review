import { ProgramType } from '../domain-models'
import statePrograms from '../data/statePrograms.json'

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
