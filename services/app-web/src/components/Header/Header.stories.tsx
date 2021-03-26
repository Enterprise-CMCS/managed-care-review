import React from 'react'
import { Story } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { Header, HeaderProps } from './Header'
import { getCurrentUserMock } from '../../utils/apolloUtils'

export default {
    title: 'Components/Header',
    component: Header,
}

const Template: Story<HeaderProps> = (args) => <Header {...args} />

export const CMSHeaderLoggedOut = Template.bind({})
CMSHeaderLoggedOut.decorators = [(Story) => ProvidersDecorator(Story, {})]

export const CMSHeaderLoggedIn = Template.bind({})

CMSHeaderLoggedIn.decorators = [
    (Story) =>
        ProvidersDecorator(Story, {
            apolloProvider: {
                mocks: [getCurrentUserMock({ statusCode: 200 })],
            },
        }),
]
