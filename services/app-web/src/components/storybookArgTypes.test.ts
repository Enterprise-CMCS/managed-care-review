import { StateCodes } from '@mc-review/submissions'
import actionButtonMeta, {
    Playground,
} from './ActionButton/ActionButton.stories'
import stateIconMeta from './Header/StateIcon/StateIcon.stories'
import infoTagMeta from './InfoTag/InfoTag.stories'
import multiColumnGridMeta from './MultiColumnGrid/MultiColumnGrid.stories'

describe('Storybook metadata for props react-docgen cannot resolve', () => {
    it('documents the inherited USWDS and Tealium ActionButton props', () => {
        expect(Object.keys(actionButtonMeta.argTypes)).toEqual(
            expect.arrayContaining([
                'type',
                'secondary',
                'base',
                'accentStyle',
                'outline',
                'inverse',
                'size',
                'unstyled',
                'button_style',
                'button_type',
                'parent_component_heading',
                'parent_component_type',
                'link_url',
                'event_extension',
            ])
        )
        expect(actionButtonMeta.argTypes.type.options).toEqual([
            'button',
            'submit',
            'reset',
        ])
        expect(Playground.args).toMatchObject({
            type: 'button',
            children: 'Click Me',
        })
    })

    it('does not offer controls for inherited props the wrappers override', () => {
        expect(actionButtonMeta.argTypes.secondary.control).toBe(false)
        expect(actionButtonMeta.argTypes.outline.control).toBe(false)
        expect(actionButtonMeta.argTypes.unstyled.control).toBe(false)
        expect(infoTagMeta.argTypes.background.table.type.summary).toBe(
            'string'
        )
        expect(infoTagMeta.argTypes.background.control).toBe(false)
    })

    it('offers all supported state codes in a select control', () => {
        expect(stateIconMeta.argTypes.code.options).toEqual(StateCodes)
        expect(stateIconMeta.argTypes.code.control).toBe('select')
    })

    it('offers numeric column counts from 1 through 12 in a select control', () => {
        expect(multiColumnGridMeta.argTypes.columns.options).toEqual(
            Array.from({ length: 12 }, (_, index) => index + 1)
        )
        expect(multiColumnGridMeta.argTypes.columns.control).toBe('select')
    })
})
