import React from 'react'
import { StoryFn } from '@storybook/react'
import { Breadcrumbs, BreadcrumbsProps } from './Breadcrumbs'
import ProvidersDecorator from '../../../.storybook/providersDecorator'

export default {
    title: 'Components/Breadcrumbs',
    component: Breadcrumbs,
    parameters: {
        componentSubtitle:
            'Breadcrumbs provide secondary navigation to help users understand where they are in a website.',
    },
}

const Template: StoryFn<BreadcrumbsProps> = (args) => <Breadcrumbs {...args} />

export const Default = Template.bind({})
Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
Default.args = {
    items: [
        { text: 'First link', link: '/firstlink' },
        { text: 'Second link', link: '/secondlink' },
        { text: 'Active link', link: '/thirdlink' },
    ],
}
