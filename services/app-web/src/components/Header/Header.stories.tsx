import React from 'react'
import { Story } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { Header, HeaderProps } from './Header'
import { CURRENT_USER } from '../../api'

export default {
    title: 'Components/Header',
    component: Header,
}

const successfulLoginMock = {
    request: { query: CURRENT_USER },
    result: {
        data: {
            getCurrentUser: {
                state: 'MN',
                role: 'State User',
                name: 'Bob it user',
                email: 'bob@dmas.mn.gov',
            },
        },
    },
}
const Template: Story<HeaderProps> = (args) => <Header {...args} />

export const CMSHeaderLoggedOut = Template.bind({})
CMSHeaderLoggedOut.decorators = [(Story) => ProvidersDecorator(Story, {})]

export const CMSHeaderLoggedIn = Template.bind({})

CMSHeaderLoggedIn.args = {
    stateCode: 'MN',
    user: {
        name: 'Bob test user',
        email: 'bob@dmas.mn.gov',
    },
}

CMSHeaderLoggedIn.decorators = [
    (Story) =>
        ProvidersDecorator(Story, {
            apolloProvider: { mocks: [successfulLoginMock] },
        }),
]
