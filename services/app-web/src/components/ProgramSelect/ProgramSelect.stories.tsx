import { Story } from '@storybook/react'
import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { ProgramSelect, ProgramSelectPropType } from './'
import { mockMNState } from '../../testHelpers/apolloHelpers'

export default {
    title: 'Components/ProgramSelect',
    component: ProgramSelect,
}

const statePrograms = mockMNState().programs

const Template: Story<ProgramSelectPropType> = (args) => (
    <ProgramSelect {...args} />
)

export const WithAction = Template.bind({})
WithAction.decorators = [(Story) => ProvidersDecorator(Story, {})]

WithAction.args = {
    statePrograms,
    programIDs: ['ea16a6c0-5fc6-4df8-adac-c627e76660ab'],
}
