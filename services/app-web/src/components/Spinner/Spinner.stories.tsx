import { StoryFn } from '@storybook/react'

import { Spinner, SpinnerProps } from './Spinner'

export default {
    title: 'Components/Spinner',
    component: Spinner,
}

const Template: StoryFn<SpinnerProps> = (args) => <Spinner {...args} />

export const SpinnerDefault = Template.bind({})

export const SpinnerSmall = Template.bind({})
SpinnerSmall.args = {
    size: 'small',
}

export const SpinnerBig = Template.bind({})
SpinnerBig.args = {
    size: 'big',
}

export const SpinnerInverted = Template.bind({})
SpinnerInverted.args = {
    inversed: true,
}

export const SpinnerFilled = Template.bind({})
SpinnerFilled.args = {
    filled: true,
}

export const SpinnerInvertedFilled = Template.bind({})
SpinnerInvertedFilled.args = {
    inversed: true,
    filled: true,
}
