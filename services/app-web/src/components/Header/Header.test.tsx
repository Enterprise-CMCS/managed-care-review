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

    it('has logo image link that goes to /dashboard', async () => {
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
    describe('when logged out', () => {
        it.todo('has Welcome to MCRRS heading')
        it('displays signin link when logged out', async () => {
            render(
                <BrowserRouter>
                    <Header loggedIn={false} />
                </BrowserRouter>
            )
            expect(screen.getAllByRole('link')[1]).toHaveTextContent('Sign In')
        })
        it.todo('signin link goes to /auth')
    })
    describe('when logged in', () => {
        it.todo('has heading with users state')
        it.todo('has heading with the current program')
        it('displays sign out button', async () => {
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

        it.todo('calls logout when signout button is clicked')
        it.todo(
            'redirects to auth page when signout button is clicked and logout is successful'
        )
        it.todo(
            'displays error when signout button is clicked and logout is unsuccessful'
        )
    })
})
