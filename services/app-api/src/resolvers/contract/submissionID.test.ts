import { packageName } from '@mc-review/submissions'

describe('submission IDs', () => {
    const programs = [
        {
            id: 'program-1',
            name: 'Program One',
            fullName: 'Program One',
            isRateProgram: false,
            isDeprecated: false,
        },
        {
            id: 'program-2',
            name: 'Program Two',
            fullName: 'Program Two',
            isRateProgram: false,
            isDeprecated: false,
        },
    ]

    it('formats EQRO IDs independently of program names', () => {
        expect(
            packageName('mn', 5, ['program-1', 'program-2'], programs, 'EQRO')
        ).toBe('MCR-EQRO-MN-0005')
        expect(packageName('MN', 5, ['unknown'], [], 'EQRO')).toBe(
            'MCR-EQRO-MN-0005'
        )
        expect(packageName('MN', 5, [], [], 'EQRO')).toBe('MCR-EQRO-MN-0005')
    })

    it('preserves sequential numbers and does not truncate longer numbers', () => {
        expect(packageName('MN', 9999, [], [], 'EQRO')).toBe('MCR-EQRO-MN-9999')
        expect(packageName('MN', 10000, [], [], 'EQRO')).toBe(
            'MCR-EQRO-MN-10000'
        )
    })

    it('preserves the health plan format and default behavior', () => {
        const ids = ['program-2', 'program-1']
        expect(packageName('mn', 5, ids, programs)).toBe(
            'MCR-MN-0005-PROGRAMONE-PROGRAMTWO'
        )
        expect(packageName('mn', 5, ids, programs, 'HEALTH_PLAN')).toBe(
            'MCR-MN-0005-PROGRAMONE-PROGRAMTWO'
        )
    })
})
