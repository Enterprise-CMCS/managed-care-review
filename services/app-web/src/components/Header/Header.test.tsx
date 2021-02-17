import React from 'react'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Header } from './Header'

describe('Header', () => {
    it('renders without errors', async () => {
        const { getByRole } = render(
            <BrowserRouter>
                <Header
                    loggedIn
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />
            </BrowserRouter>
        )
        expect(getByRole('heading')).toBeInTheDocument()
    })
    it('has signout button', async () => {
        const { getByTestId } = render(
            <BrowserRouter>
                <Header
                    loggedIn
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />
            </BrowserRouter>
        )
        expect(getByTestId('button')).toHaveTextContent('Sign out')
    })
    it('has logo link', async () => {
        render(
            <BrowserRouter>
                <Header loggedIn={false} />
            </BrowserRouter>
        )
        const logoImage = screen.getByAltText(
            'Medicaid.gov-Keeping America Healthy'
        )
        expect(screen.getAllByRole('link')[0]).toContainElement(logoImage)
        expect(screen.getAllByRole('link')[0]).toHaveAttribute(
            'href',
            '/dashboard'
        )
    })

    it('has signin link', async () => {
        render(
            <BrowserRouter>
                <Header loggedIn={false} />
            </BrowserRouter>
        )
        expect(screen.getAllByRole('link')[1]).toHaveTextContent('Sign In')
    })
})
