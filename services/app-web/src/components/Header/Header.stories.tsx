import { StoryFn } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { Header, HeaderProps } from './Header'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks'

export default {
    title: 'Components/Header',
    component: Header,
    parameters: {
        componentSubtitle:
            'Header identifies the name of the application, the current page, and provides a quick way to log in and out.',
    },
}

const Template: StoryFn<HeaderProps> = (args) => <Header {...args} />

export const CMSHeaderLoggedOut = Template.bind({})
CMSHeaderLoggedOut.decorators = [(StoryFn) => ProvidersDecorator(StoryFn, {})]

export const CMSHeaderLoggedIn = Template.bind({})

CMSHeaderLoggedIn.decorators = [
    (StoryFn) =>
        ProvidersDecorator(StoryFn, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        }),
]
