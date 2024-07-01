import React from 'react'
import { StoryFn } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'

import {
    DynamicStepIndicatorProps,
    DynamicStepIndicator,
} from './DynamicStepIndicator'

import { STATE_SUBMISSION_FORM_ROUTES } from '../../constants/routes'

export default {
    title: 'Components/DynamicStepIndicator',
    component: DynamicStepIndicator,
    parameters: {
        componentSubtitle:
            'DynamicStepIndicator displays a users progress through a multi-step process. If an invalid route is passed in as the current page, DynamicStepIndicator will render null.',
    },
}

const Template: StoryFn<DynamicStepIndicatorProps> = (args) => (
    <DynamicStepIndicator {...args} />
)

export const Default = Template.bind({})
Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

Default.args = {
    formPages: STATE_SUBMISSION_FORM_ROUTES,
    currentFormPage: STATE_SUBMISSION_FORM_ROUTES[4],
}
