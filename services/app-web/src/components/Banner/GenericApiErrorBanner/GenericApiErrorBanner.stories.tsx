import React from 'react'
import { StoryFn } from '@storybook/react'
import {
    GenericApiErrorBanner,
    GenericApiErrorProps,
} from './GenericApiErrorBanner'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

export default {
    title: 'Components/Banner/GenericApiErrorBanner',
    component: GenericApiErrorBanner,
}

const Template: StoryFn<GenericApiErrorProps> = (args) => (
    <GenericApiErrorBanner {...args} />
)

export const Default = Template.bind({})
Default.args = {}
Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const CustomHeadingAndMessage = Template.bind({})
CustomHeadingAndMessage.args = {
    heading: 'Custom error heading',
    message: 'Something went wrong with your request.',
}
CustomHeadingAndMessage.decorators = [
    (StoryFn) => ProvidersDecorator(StoryFn, {}),
]

export const ValidationError = Template.bind({})
ValidationError.args = {
    validationFail: true,
    heading: 'Validation failed',
    message: 'Please check your input and try again.',
}
ValidationError.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
