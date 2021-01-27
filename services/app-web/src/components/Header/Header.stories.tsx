import React from 'react'

import { Header } from './Header'

export default {
    title: 'Components/Header',
    component: Header,
    parameters: {
        info: 'CMS Header for logged in state user.',
    },
}

export const StateUserHeader = (): React.ReactElement => <Header />
