import React from 'react'
import { Program } from '../gen/gqlClient'

const getAvailableContractPrograms = (
    programs: Program[],
    selectedProgramIDs: string[] = []
): Program[] =>
    programs.filter(
        (program) =>
            !program.isRateProgram &&
            (!program.isDeprecated || selectedProgramIDs.includes(program.id))
    )

/**
 * Returns a span containing the program name, with an italic "(retired)"
 * suffix for deprecated programs.
 * @param program - The program object containing program data.
 */
const formattedProgramName = (program: Program): React.ReactElement => {
    const name = program?.name ?? 'Unknown Program'
    return (
        <span data-testid={`program-${program?.id}`}>
            {name}
            {program?.isDeprecated && (
                <span style={{ fontStyle: 'italic' }}> (retired)</span>
            )}
        </span>
    )
}

/**
 * Returns an element with all programs names with an italic "(retired)" suffix
 * for deprecated programs. Intended to be passed as children to DataDetail,
 * which joins array children with commas.
 * @param programs - The list of program objects to look up against.
 * @param programIDs - The list of program IDs to render names for.
 */
const formattedProgramNames = (
    programs: Program[],
    programIDs: string[]
): React.ReactElement | null => {
    if (programIDs.length === 0 || programs.length === 0) {
        return null
    }
    return (
        <>
            {programIDs.map((id, index) => {
                const program = programs.find((p) => p.id === id)
                const name = program?.name ?? 'Unknown Program'
                const isDeprecated = program?.isDeprecated ?? false
                return (
                    <React.Fragment key={id}>
                        {index > 0 && ', '}
                        <span data-testid={`program-${id}`}>
                            {name}
                            {isDeprecated && (
                                <span style={{ fontStyle: 'italic' }}>
                                    {' '}
                                    (retired)
                                </span>
                            )}
                        </span>
                    </React.Fragment>
                )
            })}
        </>
    )
}

export {
    formattedProgramName,
    formattedProgramNames,
    getAvailableContractPrograms,
}
