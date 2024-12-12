import { screen } from '@testing-library/react'
import { ActuaryContact, StateContact } from '@mc-review/hpp'

import { DataDetailContactField } from './DataDetailContactField'
import { renderWithProviders } from '../../../testHelpers'

describe('DataDetailContactField', () => {
    it('renders without errors', () => {
        const contact: StateContact = {
            name: 'Wednesday Addams',
            titleRole: 'Writer/Detective',
            email: `wedsaddams@example.com`,
        }
        renderWithProviders(<DataDetailContactField contact={contact} />)
        expect(screen.getByText(/Wednesday Addams/)).toBeInTheDocument()
        expect(screen.getByText(/Writer/)).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'wedsaddams@example.com' })
        ).toBeInTheDocument()
    })

    it('renders actuarial field when relevant', () => {
        const contact: ActuaryContact = {
            name: 'Wednesday Addams',
            titleRole: 'Writer/Detective/Numbers Expert',
            email: `wedsaddams@example.com`,
            actuarialFirm: 'OTHER',
            actuarialFirmOther: 'All Black Incorporated',
        }
        renderWithProviders(<DataDetailContactField contact={contact} />)
        expect(screen.getByText(/Wednesday Addams/)).toBeInTheDocument()
        expect(screen.getByText(/Numbers Expert/)).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'wedsaddams@example.com' })
        ).toBeInTheDocument()
        expect(screen.getByText(/All Black Incorporated/)).toBeInTheDocument()
    })
})
