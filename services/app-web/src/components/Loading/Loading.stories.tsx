import { StoryFn } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { Loading } from './Loading'

export default {
    title: 'Components/Loading',
    component: Loading,
}

const Template: StoryFn = (args) => <Loading {...args} />

export const LoadingDefault = Template.bind({})
LoadingDefault.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]
