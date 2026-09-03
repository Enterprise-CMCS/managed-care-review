import { typedStatePrograms } from '@mc-review/submissions'
import { findAllStatePrograms } from './findStatePrograms'

describe('findAllStatePrograms', () => {
    it('returns every program with its associated state', async () => {
        const result = await findAllStatePrograms()
        if (result instanceof Error) {
            throw result
        }

        expect(result.length).toBe(
            typedStatePrograms.states.reduce(
                (total, state) => total + state.programs.length,
                0
            )
        )
        expect(result).toContainEqual({
            stateCode: 'FL',
            stateName: 'Florida',
            program: expect.objectContaining({ name: 'MMA' }),
        })
        expect(
            result.every((stateProgram) => stateProgram.stateCode.length === 2)
        ).toBe(true)

        const sortedResult = [...result].sort(
            (a, b) =>
                a.stateCode.localeCompare(b.stateCode) ||
                a.program.name.localeCompare(b.program.name)
        )
        expect(result).toEqual(sortedResult)
    })
})
