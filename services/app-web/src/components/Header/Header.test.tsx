import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { Header, HeaderProps } from './Header'
import { useAuth } from '../../pages/App/AuthContext'

const RouterWrappedHeader = (props: HeaderProps) => {
    return (
        <BrowserRouter>
            <Header {...props} />
        </BrowserRouter>
    )
}

describe('Header', () => {
    it('renders without errors', async () => {
        const { getByRole } = render(
            <RouterWrappedHeader
                loggedIn
                stateCode={'MN'}
                user={{
                    name: 'Bob test user',
                    email: 'bob@dmas.mn.gov',
                }}
            />
        )
        expect(getByRole('banner')).toBeInTheDocument()
        expect(getByRole('heading')).toBeInTheDocument()
    })

    describe('when logged out', () => {
        it('has Medicaid logo image link that redirects to /dashboard', async () => {
            render(<RouterWrappedHeader loggedIn={false} />)
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /Medicaid.gov-Keeping America Healthy/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/dashboard')
            expect(logoLink).toContainElement(logoImage)
        })

        it('has  Medicaid and CHIP Managed Care Reporting heading', () => {
            render(<RouterWrappedHeader loggedIn={false} />)

            expect(screen.getByRole('heading')).toHaveTextContent(
                'Medicaid and CHIP Managed Care Reporting and Review System'
            )
        })

        it('displays signin link when logged out', async () => {
            render(<RouterWrappedHeader loggedIn={false} />)
            expect(screen.getByRole('link', { name: /Sign In/i })).toBeVisible()
        })
        it.todo('signin link goes to /auth')
    })

    describe('when logged in', () => {
        it('has Medicaid logo image link that redirects to /dashboard', async () => {
            render(<RouterWrappedHeader loggedIn />)
            const logoImage = screen.getByRole('img')
            const logoLink = screen.getByRole('link', {
                name: /Medicaid.gov-Keeping America Healthy/i,
            })
            expect(logoLink).toBeVisible()
            expect(logoLink).toHaveAttribute('href', '/dashboard')
            expect(logoLink).toContainElement(logoImage)
        })

        it('has heading with users state', () => {
            // TODO: make a loop
            render(<RouterWrappedHeader loggedIn stateCode="MN" />)
            expect(screen.getByRole('heading')).toHaveTextContent('Minnesota')
        })

        it.todo('has heading with the current program')

        it('displays sign out button', async () => {
            render(
                <RouterWrappedHeader
                    loggedIn
                    stateCode={'MN'}
                    user={{
                        name: 'Bob test user',
                        email: 'bob@dmas.mn.gov',
                    }}
                />
            )
            expect(
                screen.getByRole('button', { name: /Sign out/i })
            ).toHaveTextContent('Sign out')
        })

        it.todo('calls logout when signout button is clicked')

        it.todo(
            'shows signin link and redirects to auth page when signout button is clicked and logout is successful'
        )

        it.todo(
            'displays error when signout button is clicked and logout is unsuccessful'
        )
    })
})
