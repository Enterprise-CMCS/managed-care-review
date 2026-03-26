import React from 'react'
import { StoryFn } from '@storybook/react'
import { DocumentWarningBanner } from './DocumentWarningBanner'
import ProvidersDecorator from '../../../../.storybook/providersDecorator'

export default {
    title: 'Components/Banner/DocumentWarningBanner',
    component: DocumentWarningBanner,
}

const Template: StoryFn = () => <DocumentWarningBanner />

export const Default = Template.bind({})
Default.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
