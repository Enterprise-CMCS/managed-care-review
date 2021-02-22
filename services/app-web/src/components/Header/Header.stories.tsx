import React from 'react'
import { Story } from '@storybook/react'
import { BrowserRouter } from 'react-router-dom'

import { Header, HeaderProps } from './Header'

export default {
    title: 'Components/Header',
    component: Header,
}

const Template: Story<HeaderProps> = (args) => (
    <BrowserRouter>
        <Header {...args} />
    </BrowserRouter>
)

export const CMSHeaderLoggedIn = Template.bind({})

CMSHeaderLoggedIn.args = {
    stateCode: 'MN',
    user: {
        name: 'Bob test user',
        email: 'bob@dmas.mn.gov',
    },
}

// TODO
// export const CMSHeaderLoggedOut = Template.bind({})

// CMSHeaderLoggedOut.args = {}
