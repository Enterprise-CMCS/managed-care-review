import React from 'react'
import { Story } from '@storybook/react'
import { Router } from 'react-router-dom'
import { Header, HeaderProps } from './Header'

export default {
    title: 'Components/Header',
    component: Header,
}

const Template: Story<HeaderProps> = (args) => (
    <Router>
        <Header {...args} />
    </Router>
)

export const CMSHeader = Template.bind({})

CMSHeader.args = {
    loggedIn: true,
    stateCode: 'MN',
    user: {
        name: 'Bob test user',
        email: 'bob@dmas.mn.gov',
    },
}
