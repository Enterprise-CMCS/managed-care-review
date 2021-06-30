import React from 'react'
import { Story } from '@storybook/react'
import dayjs from 'dayjs'
import styles from './SubmissionCard.module.scss'

import {
    SubmissionCard,
    SubmissionCardProps,
    SubmissionType,
    SubmissionStatus,
} from './SubmissionCard'

export default {
    title: 'Components/SubmissionCard',
    component: SubmissionCard,
    parameters: {
        componentSubtitle:
            'SubmissionCard displays important information about a managed care submission.',
    },
    argTypes: {
        date: {
            control: {
                type: 'date',
            },
        },
    },
}

const Template: Story<SubmissionCardProps> = (args) => (
    <ul className={styles.submissionList}>
        <SubmissionCard {...args} />
    </ul>
)

export const Draft = Template.bind({})

Draft.args = {
    name: 'VA-CCCPlus-0001',
    description:
        'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
    submissionType: SubmissionType.ContractOnly,
    status: SubmissionStatus.draft,
}

export const Submitted = Template.bind({})

Submitted.args = {
    name: 'VA-CCCPlus-0001',
    description:
        'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
    submissionType: SubmissionType.ContractAndRates,
    status: SubmissionStatus.submitted,
    date: dayjs(),
}
