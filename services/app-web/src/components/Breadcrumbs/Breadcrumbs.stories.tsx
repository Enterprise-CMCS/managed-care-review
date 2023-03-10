import React from 'react'
import { Story } from '@storybook/react'
import { Breadcrumbs, BreadcrumbsProps } from './Breadcrumbs'

export default {
    title: 'Components/Breadcrumbs',
    component: Breadcrumbs,
    parameters: {
        componentSubtitle:
            'Breadcrumbs provide secondary navigation to help users understand where they are in a website.',
    },
}

const Template: Story<BreadcrumbsProps> = (args) => <Breadcrumbs {...args} />

export const Default = Template.bind({})
Default.args = {
    items: [
        { text: 'First link', link: '/firstlink' },
        { text: 'Second link', link: '/secondlink' },
        { text: 'Active link, no href needed' },
    ],
}
