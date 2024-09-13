export interface StatePrograms {
    states: State[]
}

export interface State {
    name: string
    programs: Program[]
    code: string
}

export interface Program {
    id: string
    fullName: string
    name: string
    isRateProgram: boolean
}
