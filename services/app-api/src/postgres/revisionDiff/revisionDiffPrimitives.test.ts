import {
    buildContactCollectionChanges,
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
                changeType: 'REMOVED',
                key: 'removed-rate',
                previous: {
                    id: 'removed-rate',
                    value: 'old only',
                },
            },
            {
                changeType: 'UPDATED',
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
                changeType: 'ADDED',
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

    const contactIdentity = (item: { name?: string; email?: string }) => [
        item.name,
        item.email,
    ]

    it('buildContactCollectionChanges marks edited contacts UPDATED and appended contacts ADDED', () => {
        const result = buildContactCollectionChanges(
            [
                { name: 'Ada', email: 'ada@example.com' },
                { name: 'Bea', email: 'bea@example.com' },
            ],
            [
                { name: 'Ada', email: 'ada@example.com' },
                { name: 'Bea', email: 'bea-updated@example.com' },
                { name: 'Cy', email: 'cy@example.com' },
            ],
            (item) => JSON.stringify(item),
            contactIdentity
        )

        expect(result).toEqual([
            {
                changeType: 'UPDATED',
                index: 1,
                current: {
                    name: 'Bea',
                    email: 'bea-updated@example.com',
                },
            },
            {
                changeType: 'ADDED',
                index: 2,
                current: {
                    name: 'Cy',
                    email: 'cy@example.com',
                },
            },
        ])
    })

    it('buildContactCollectionChanges reports an appended duplicate as ADDED', () => {
        const result = buildContactCollectionChanges(
            [{ name: 'Ada' }, { name: 'Ada' }],
            [{ name: 'Ada' }, { name: 'Ada' }, { name: 'Ada' }],
            (item) => JSON.stringify(item),
            contactIdentity
        )

        expect(result).toEqual([
            {
                changeType: 'ADDED',
                index: 2,
                current: {
                    name: 'Ada',
                },
            },
        ])
    })

    it('buildContactCollectionChanges reports no changes when contacts are removed or reordered', () => {
        const removal = buildContactCollectionChanges(
            [{ name: 'Ada' }, { name: 'Bea' }, { name: 'Cy' }],
            [{ name: 'Ada' }, { name: 'Cy' }],
            (item) => JSON.stringify(item),
            contactIdentity
        )
        const reorder = buildContactCollectionChanges(
            [{ name: 'Ada' }, { name: 'Bea' }, { name: 'Cy' }],
            [{ name: 'Cy' }, { name: 'Ada' }, { name: 'Bea' }],
            (item) => JSON.stringify(item),
            contactIdentity
        )

        expect(removal).toEqual([])
        expect(reorder).toEqual([])
    })

    it('buildContactCollectionChanges reports a replacement contact as ADDED, not UPDATED', () => {
        const result = buildContactCollectionChanges(
            [
                { name: 'Ada', email: 'ada@example.com' },
                { name: 'Ben', email: 'ben@example.com' },
            ],
            [
                { name: 'Ada', email: 'ada@example.com' },
                { name: 'Dana', email: 'dana@example.com' },
            ],
            (item) => JSON.stringify(item),
            contactIdentity
        )

        expect(result).toEqual([
            {
                changeType: 'ADDED',
                index: 1,
                current: {
                    name: 'Dana',
                    email: 'dana@example.com',
                },
            },
        ])
    })

    it('buildContactCollectionChanges treats a contact keeping only its email as UPDATED', () => {
        const result = buildContactCollectionChanges(
            [{ name: 'Ada Old', email: 'ada@example.com' }],
            [{ name: 'Ada New', email: 'ada@example.com' }],
            (item) => JSON.stringify(item),
            contactIdentity
        )

        expect(result).toEqual([
            {
                changeType: 'UPDATED',
                index: 0,
                current: {
                    name: 'Ada New',
                    email: 'ada@example.com',
                },
            },
        ])
    })
})
