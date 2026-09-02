import { typedStatePrograms } from '@mc-review/submissions'
import type { ProgramType, StateProgramType } from '../../domain-models'

// Currently relies on state programs json; does not query postgres
async function findAllStatePrograms(): Promise<StateProgramType[] | Error> {
    return typedStatePrograms.states
        .flatMap((state) =>
            state.programs.map((program) => ({
                stateCode: state.code,
                stateName: state.name,
                program,
            }))
        )
        .sort(
            (a, b) =>
                a.stateCode.localeCompare(b.stateCode) ||
                a.program.name.localeCompare(b.program.name)
        )
}

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

export { findAllStatePrograms, findStatePrograms }
