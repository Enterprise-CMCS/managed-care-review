import { formatProgramName, programNames } from './contractHelpers'
import { ProgramArgType } from '../statePrograms'

const mockProgram = (
    overrides?: Partial<ProgramArgType>
): ProgramArgType => ({
    id: 'test-id',
    name: 'Test Program',
    fullName: 'Test Program Full Name',
    isRateProgram: false,
    isDeprecated: false,
    ...overrides,
})

describe('formatProgramName', () => {
    it('returns the program name for a non-deprecated program', () => {
        const program = mockProgram()
        expect(formatProgramName(program)).toBe('Test Program')
    })

    it('appends (retired) for a deprecated program', () => {
        const program = mockProgram({ isDeprecated: true })
        expect(formatProgramName(program)).toBe('Test Program (retired)')
    })
})

describe('programNames', () => {
    const programs = [
        mockProgram({ id: '1', name: 'Alpha' }),
        mockProgram({ id: '2', name: 'Bravo' }),
        mockProgram({ id: '3', name: 'Charlie', isDeprecated: true }),
    ]

    it('returns program names matching the given IDs', () => {
        expect(programNames(programs, ['1', '2'])).toEqual(['Alpha', 'Bravo'])
    })

    it('returns "Unknown Program" for IDs not found', () => {
        expect(programNames(programs, ['1', 'missing-id'])).toEqual([
            'Alpha',
            'Unknown Program',
        ])
    })

    it('does not append (retired) when displayRetired is false', () => {
        expect(programNames(programs, ['3'])).toEqual(['Charlie'])
    })

    it('appends (retired) to deprecated programs when displayRetired is true', () => {
        expect(programNames(programs, ['3'], true)).toEqual([
            'Charlie (retired)',
        ])
    })

    it('only appends (retired) to deprecated programs, not active ones', () => {
        expect(programNames(programs, ['1', '3'], true)).toEqual([
            'Alpha',
            'Charlie (retired)',
        ])
    })

    it('returns an empty array when given no IDs', () => {
        expect(programNames(programs, [])).toEqual([])
    })
})
