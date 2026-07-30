import {
    buildScalarFieldDiffChanges,
    diffCollectionByKey,
} from './revisionDiffPrimitives'

describe('revisionDiffPrimitives', () => {
    it('buildScalarFieldDiffChanges returns only changed scalar fields', () => {
        const result = buildScalarFieldDiffChanges(
            {
                name: 'original',
                enabled: false,
            },
            {
                name: 'updated',
                enabled: false,
            },
            [
                {
                    fieldPath: 'name',
                    getValue: (item) => item.name,
                },
                {
                    fieldPath: 'enabled',
                    getValue: (item) => (item.enabled ? 'Yes' : 'No'),
                },
            ],
            undefined
        )

        expect(result).toEqual([
            {
                fieldPath: 'name',
                oldValue: 'original',
                newValue: 'updated',
            },
        ])
    })

    it('buildScalarFieldDiffChanges treats equal arrays and dates as unchanged values', () => {
        const result = buildScalarFieldDiffChanges(
            {
                programIDs: ['b', 'a'],
                contractDateStart: new Date('2027-01-01T00:00:00.000Z'),
            },
            {
                programIDs: ['b', 'a'],
                contractDateStart: new Date('2027-01-01T00:00:00.000Z'),
            },
            [
                {
                    fieldPath: 'programIDs',
                    getValue: (item) => [...item.programIDs],
                },
                {
                    fieldPath: 'contractDateStart',
                    getValue: (item) => item.contractDateStart,
                },
            ],
            undefined
        )

        expect(result).toEqual([])
    })

    it('diffCollectionByKey classifies added, removed, and updated items', () => {
        const result = diffCollectionByKey({
            previous: [
                {
                    id: 'removed-rate',
                    value: 'old only',
                },
                {
                    id: 'updated-rate',
                    value: 'before',
                },
            ],
            current: [
                {
                    id: 'updated-rate',
                    value: 'after',
                },
                {
                    id: 'added-rate',
                    value: 'new only',
                },
            ],
            getKey: (item) => item.id,
            buildChanges: (previous, current) =>
                buildScalarFieldDiffChanges(
                    previous,
                    current,
                    [
                        {
                            fieldPath: 'value',
                            getValue: (item) => item.value,
                        },
                    ],
                    undefined
                ),
        })

        expect(result).toEqual([
            {
                kind: 'removed',
                key: 'removed-rate',
                previous: {
                    id: 'removed-rate',
                    value: 'old only',
                },
            },
            {
                kind: 'updated',
                key: 'updated-rate',
                previous: {
                    id: 'updated-rate',
                    value: 'before',
                },
                current: {
                    id: 'updated-rate',
                    value: 'after',
                },
                changes: [
                    {
                        fieldPath: 'value',
                        oldValue: 'before',
                        newValue: 'after',
                    },
                ],
            },
            {
                kind: 'added',
                key: 'added-rate',
                current: {
                    id: 'added-rate',
                    value: 'new only',
                },
            },
        ])
    })

    it('diffCollectionByKey returns an error when keys are duplicated', () => {
        const result = diffCollectionByKey({
            previous: [
                {
                    id: 'duplicate',
                    value: 'first',
                },
                {
                    id: 'duplicate',
                    value: 'second',
                },
            ],
            current: [],
            getKey: (item) => item.id,
            buildChanges: () => [],
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain('Duplicate diff key')
    })
})
