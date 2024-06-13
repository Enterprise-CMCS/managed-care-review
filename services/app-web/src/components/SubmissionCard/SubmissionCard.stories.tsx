import React from 'react'
import { StoryFn } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'
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

const Template: StoryFn<SubmissionCardProps> = (args) => (
    <ul className={styles.submissionList}>
        <SubmissionCard {...args} />
    </ul>
)

export const Default = Template.bind({})
Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

Default.args = {
    name: 'VA-CCCPlus-0001',
    description:
        'Rates are being adjusted to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.',
    submissionType: SubmissionType.ContractAndRates,
    status: SubmissionStatus.submitted,
    date: dayjs(),
    href: '/',
}
