const StateCodes = [
    'AS',
    'AK',
    'AL',
    'AR',
    'AZ',
    'CA',
    'CO',
    'CT',
    'DC',
    'DE',
    'FL',
    'GA',
    'HI',
    'IA',
    'ID',
    'IL',
    'IN',
    'KS',
    'KY',
    'LA',
    'MA',
    'MD',
    'ME',
    'MI',
    'MN',
    'MO',
    'MS',
    'MT',
    'NC',
    'ND',
    'NE',
    'NH',
    'NJ',
    'NM',
    'NV',
    'NY',
    'OH',
    'OK',
    'OR',
    'PA',
    'PR',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VA',
    'VT',
    'WA',
    'WI',
    'WV',
    'WY',
] as const

type StateCodeType = (typeof StateCodes)[number] // iterable union type

function isValidStateCode(
    maybeStateCode: string
): maybeStateCode is StateCodeType {
    return (StateCodes as ReadonlyArray<string>).includes(maybeStateCode)
}

type StateType = {
    code: string
    name: string
    programs: ProgramArgType[]
}

interface ProgramArgType {
    id: string
    name: string // short name. This is used most often in the application including in submission name
    fullName: string // full name is used in submission summary page
    isRateProgram: boolean // specifies if program relates to rates rather than contract
}

interface StatePrograms {
    states: StateType[]
}

export { StateCodes, isValidStateCode }
export type { StateCodeType, StateType, ProgramArgType, StatePrograms }
