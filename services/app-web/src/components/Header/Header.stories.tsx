import React from 'react'
import { Story } from '@storybook/react'

import ProvidersDecorator from '../../../.storybook/providersDecorator'
import { Header, HeaderProps } from './Header'
import { HELLO_WORLD } from '../../api'
import { UserType } from '../../common-code/domain-models'

export default {
    title: 'Components/Header',
    component: Header,
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
            apolloProvider: {
                mocks: [
                    {
                        request: { query: HELLO_WORLD },
                        result: { data: {} },
                    },
                ],
            },
            authProvider: {
                localLogin: false,
                initialize: {
                    user: {
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    } as UserType,
                },
            },
        }),
]
