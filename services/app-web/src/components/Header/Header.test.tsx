import React from 'react'
import { render } from '@testing-library/react'

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
    it('has signout button', async () => {
        const { getByTestId } = render(
            <Header
                loggedIn
                stateCode={'MN'}
                user={{
                    name: 'Bob test user',
                    email: 'bob@dmas.mn.gov',
                }}
            />
        )
        expect(getByTestId('button')).toHaveTextContent('Sign out')
    })
    it('has signin button', async () => {
        const { getByTestId } = render(<Header loggedIn={false} />)
        expect(getByTestId('button')).toHaveTextContent('Sign In')
    })
})
