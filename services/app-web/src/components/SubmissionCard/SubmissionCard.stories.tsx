import React from 'react'
import { Story } from '@storybook/react'

import { SubmissionCard, SubmissionCardProps } from './SubmissionCard'

export default {
    title: 'Components/SubmissionCard',
    component: SubmissionCard,
}

const Template: Story<SubmissionCardProps> = (args) => <SubmissionCard {...args}/>

export const Draft = Template.bind({});

Draft.args = {
    number: 'VA-CCCPlus-0001', 
    description: 'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
    type: 'Contract action and rate certification',
    submitted: false,
    date: ""
};

export const Submitted = Template.bind({});

Submitted.args = {
    number: 'VA-CCCPlus-0001', 
    description: 'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
    type: 'Contract action and rate certification',
    submitted: true,
    date: "4/13/21"
};
