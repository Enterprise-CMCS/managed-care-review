import { fieldChangeTag, changedListItemTags } from './revisionDiffTagHelpers'
import { RevisionDiffFragmentFragment } from '../../gen/gqlClient'

type FieldChanges = RevisionDiffFragmentFragment['fieldChanges']

const change = (
    fieldPath: string,
    oldValue: unknown,
    newValue: unknown
): FieldChanges[number] => ({
    __typename: 'RevisionDiffFieldChange',
    fieldPath,
    oldValue:
        oldValue === undefined
            ? null
            : {
                  __typename: 'RevisionDiffFieldValue',
                  valueType: 'STRING',
                  value: oldValue,
              },
    newValue:
        newValue === undefined
            ? null
            : {
                  __typename: 'RevisionDiffFieldValue',
                  valueType: 'STRING',
                  value: newValue,
              },
})

describe('fieldChangeTag', () => {
    it('returns undefined when the field did not change', () => {
        expect(
            fieldChangeTag([change('otherField', 'a', 'b')], 'myField')
        ).toBeUndefined()
        expect(fieldChangeTag(undefined, 'myField')).toBeUndefined()
    })

    it('returns UPDATED when the field changed between submissions', () => {
        expect(
            fieldChangeTag([change('myField', 'old', 'new')], 'myField')
        ).toBe('UPDATED')
    })

    it('returns NEW when the field had no data on the prior submission', () => {
        expect(
            fieldChangeTag([change('myField', undefined, 'new')], 'myField')
        ).toBe('NEW')
        expect(fieldChangeTag([change('myField', '', 'new')], 'myField')).toBe(
            'NEW'
        )
        expect(fieldChangeTag([change('myField', [], ['a'])], 'myField')).toBe(
            'NEW'
        )
    })

    it('returns undefined when the field lost its data', () => {
        expect(
            fieldChangeTag([change('myField', 'old', undefined)], 'myField')
        ).toBeUndefined()
        expect(
            fieldChangeTag([change('myField', ['a'], [])], 'myField')
        ).toBeUndefined()
    })
})

describe('changedListItemTags', () => {
    it('tags only the items added since the prior submission', () => {
        expect(
            changedListItemTags(
                [change('authorities', ['A', 'B'], ['A', 'B', 'C'])],
                'authorities'
            )
        ).toEqual({ C: 'UPDATED' })
    })

    it('tags every item NEW when the whole field is new', () => {
        expect(
            changedListItemTags(
                [change('authorities', undefined, ['A', 'B'])],
                'authorities'
            )
        ).toEqual({ A: 'NEW', B: 'NEW' })
    })

    it('returns no tags when the field did not change or is not a list', () => {
        expect(changedListItemTags(undefined, 'authorities')).toEqual({})
        expect(
            changedListItemTags(
                [change('authorities', 'old', 'new')],
                'authorities'
            )
        ).toEqual({})
    })
})
