import React from 'react'
import { render, getByRole } from '@testing-library/react'

import { Header } from './Header'

describe('Header', () => {
    it('renders without errors', async () => {
        const { getByRole } = render(
            <Header
                loggedIn
                stateCode={'MN'}
                user={{
                    name: 'Bob test user',
                    email: 'bob@dmas.mn.gov',
                }}
            />
        )
        expect(getByRole('heading')).toBeInTheDocument()
    })
    it('renders without errors', async () => {
        const { container } = render(
            <Header
                loggedIn
                stateCode={'MN'}
                user={{
                    name: 'Bob test user',
                    email: 'bob@dmas.mn.gov',
                }}
            />
        )
        expect(container).toHaveTextContent('Sign out')
    })
    it('renders without errors', async () => {
        const { container } = render(
            <Header
                loggedIn={false}
                stateCode={'MN'}
                user={{
                    name: 'Bob test user',
                    email: 'bob@dmas.mn.gov',
                }}
            />
        )
        expect(container).toHaveTextContent('Sign In')
    })
})
