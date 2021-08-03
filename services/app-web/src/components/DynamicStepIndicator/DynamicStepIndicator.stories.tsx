import React from 'react'
import { Story } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'

import {
    DynamicStepIndicatorProps,
    DynamicStepIndicator,
} from './DynamicStepIndicator'

import { RouteT } from '../../constants/routes'

export default {
    title: 'Components/DynamicStepIndicator',
    component: DynamicStepIndicator,
    parameters: {
        componentSubtitle:
            'DynamicStepIndicator displays a users progress through a multi-step process. If an unkown or invalid route is passed in as the current form page, it will render null.',
    },
}

const formPages = [
    'SUBMISSIONS_TYPE',
    'SUBMISSIONS_CONTRACT_DETAILS',
    'SUBMISSIONS_RATE_DETAILS',
    'SUBMISSIONS_CONTACTS',
    'SUBMISSIONS_DOCUMENTS',
    'SUBMISSIONS_REVIEW_SUBMIT',
] as RouteT[]

const Template: Story<DynamicStepIndicatorProps> = (args) => (
    <DynamicStepIndicator {...args} />
)

export const Default = Template.bind({})
Default.decorators = [(Story) => ProvidersDecorator(Story, {})]

Default.args = {
    formPages: formPages,
    currentFormPage: formPages[4],
}
