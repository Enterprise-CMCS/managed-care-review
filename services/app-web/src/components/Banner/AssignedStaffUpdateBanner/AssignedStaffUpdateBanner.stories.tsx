import React from 'react'
import { StoryFn } from '@storybook/react'
import { AssignedStaffUpdateBanner } from './AssignedStaffUpdateBanner'

export default {
    title: 'Components/Banner/AssignedStaffUpdateBanner',
    component: AssignedStaffUpdateBanner,
}

const Template: StoryFn<
    React.ComponentProps<typeof AssignedStaffUpdateBanner>
> = (args) => <AssignedStaffUpdateBanner {...args} />

export const AddedAndRemoved = Template.bind({})
AddedAndRemoved.args = {
    state: 'Minnesota',
    added: ['Jane Doe', 'John Smith'],
    removed: ['Alice Johnson'],
}

export const AddedOnly = Template.bind({})
AddedOnly.args = {
    state: 'Minnesota',
    added: ['Jane Doe'],
    removed: undefined,
}

export const RemovedOnly = Template.bind({})
RemovedOnly.args = {
    state: 'Minnesota',
    added: undefined,
    removed: ['Alice Johnson', 'Bob Williams'],
}
