export type ProgramType = {
    id: string
    name: string
    fullName: string
    isRateProgram: boolean
    isDeprecated: boolean
    deprecatedByProgramId?: string | null
}
