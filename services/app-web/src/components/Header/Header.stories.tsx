import React from 'react'
import { Story } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { Header, HeaderProps } from './Header'
import { fetchCurrentUserMock } from '../../utils/apolloUtils'

export default {
    title: 'Components/Header',
    component: Header,
    parameters: {
        componentSubtitle:
            'Header identifies the name of the application, the current page, and provides a quick way to log in and out.',
    },
}

const Template: Story<HeaderProps> = (args) => <Header {...args} />

export const CMSHeaderLoggedOut = Template.bind({})
CMSHeaderLoggedOut.decorators = [(Story) => ProvidersDecorator(Story, {})]

export const CMSHeaderLoggedIn = Template.bind({})

CMSHeaderLoggedIn.decorators = [
    (Story) =>
        ProvidersDecorator(Story, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        }),
]
