import { StoryFn } from '@storybook/react'
import { StateCodes } from '@mc-review/submissions'
import { StateIcon, StateIconProps } from './StateIcon'

export default {
    title: 'Components/Header/StateIcon',
    component: StateIcon,
    argTypes: {
        code: {
            options: StateCodes,
            control: 'select',
            table: { type: { summary: 'StateCodeType' } },
        },
    },
    parameters: {
        componentSubtitle: 'StateIcon displays the state outline svg',
        backgrounds: {
            default: 'page-heading-blue',
            values: [{ name: 'page-heading-blue', value: '#205493' }],
        },
    },
}

const Template: StoryFn<StateIconProps> = (args) => (
    <div style={{ width: 400, height: 400 }}>
        <StateIcon {...args} />
    </div>
)

export const Demo = Template.bind({})

Demo.args = {
    code: 'FL',
}
