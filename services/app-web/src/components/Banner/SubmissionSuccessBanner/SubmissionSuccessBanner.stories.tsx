import React from 'react'
import { StoryFn } from '@storybook/react'
import { SubmissionSuccessBanner } from './SubmissionSuccessBanner'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

export default {
    title: 'Components/Banner/SubmissionSuccessBanner',
    component: SubmissionSuccessBanner,
}

const Template: StoryFn<
    React.ComponentProps<typeof SubmissionSuccessBanner>
> = (args) => <SubmissionSuccessBanner {...args} />

export const HealthPlan = Template.bind({})
HealthPlan.args = {
    submissionName: 'MCR-MN-0005-SNBC',
    submissionId: 'abc-123',
    contractType: 'HEALTH_PLAN',
}
HealthPlan.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const EQRO = Template.bind({})
EQRO.args = {
    submissionName: 'MCR-MN-0010-EQRO',
    submissionId: 'def-456',
    contractType: 'EQRO',
}
EQRO.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const NoContractType = Template.bind({})
NoContractType.args = {
    submissionName: 'MCR-MN-0015-SNBC',
}
NoContractType.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
