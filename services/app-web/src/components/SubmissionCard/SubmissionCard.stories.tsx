import React from 'react'
import { Story } from '@storybook/react'
import styles from './SubmissionCard.module.scss'

import { SubmissionCard, SubmissionCardProps } from './SubmissionCard'

export default {
    title: 'Components/SubmissionCard',
    component: SubmissionCard,
}

const Template: Story<SubmissionCardProps> = (args) => 
    <ul className={styles.submissionList}>
        <SubmissionCard {...args}/>
    </ul>

export const Draft = Template.bind({});

Draft.args = {
    number: 'VA-CCCPlus-0001', 
    description: 'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
    contractType: 'contractOnly',
    status: 'draft',
};

export const Submitted = Template.bind({});

Submitted.args = {
    number: 'VA-CCCPlus-0001', 
    description: 'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
    contractType: 'contractAndRate',
    status: 'submitted',
};
