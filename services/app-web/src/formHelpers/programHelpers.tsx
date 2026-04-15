import React from 'react'
import { Program } from '../gen/gqlClient'

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
): React.ReactElement => {
    if (programIDs.length === 0 || programs.length === 0) {
        return <></>
    }
    return (
        <>
            {programIDs.map((id, index) => {
                const program = programs.find((p) => p.id === id)
                const name = program?.name ?? 'Unknown Program'
                const isDeprecated = program?.isDeprecated ?? false
                return (
                    <>
                        {index > 0 && ', '}
                        <span key={id} data-testid={`program-${id}`}>
                            {name}
                            {isDeprecated && (
                                <span style={{ fontStyle: 'italic' }}>
                                    {' '}
                                    (retired)
                                </span>
                            )}
                        </span>
                    </>
                )
            })}
        </>
    )
}

export { formattedProgramName, formattedProgramNames }
