import statePrograms from '@mc-review/submissions/src/statePrograms/statePrograms.json'

// Generate state name to code mapping from statePrograms.json
// if states are added/updated in the JSON, the mapping automatically updates
const STATE_NAME_TO_CODE: { [key: string]: string } = Object.fromEntries(
    statePrograms.states.map(state => [state.name, state.code])
)

/**
 * Converts a full state name to its two-letter state code
 * @param stateName - The full state name (e.g., "Minnesota")
 * @returns The two-letter state code (e.g., "MN"), or the original value if not found
 */
export const stateNameToStateCode = (stateName: string | undefined): string => {
    if (!stateName) return ''
    return STATE_NAME_TO_CODE[stateName] || stateName
}
