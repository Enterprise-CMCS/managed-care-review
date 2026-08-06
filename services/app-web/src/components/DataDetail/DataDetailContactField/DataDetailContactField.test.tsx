import { screen } from '@testing-library/react'
import { ActuaryContact, StateContact } from '../../../gen/gqlClient'

import { DataDetailContactField } from './DataDetailContactField'
import { renderWithProviders } from '../../../testHelpers'

describe('DataDetailContactField', () => {
    it('renders the legacy name when the contact model update flag is off', () => {
        const contact: StateContact = {
            name: 'Wednesday Addams',
            givenName: 'Structured',
            familyName: 'Contact',
            suffix: 'Jr.',
            titleRole: 'Writer/Detective',
            email: `wedsaddams@example.com`,
        }
        renderWithProviders(<DataDetailContactField contact={contact} />, {
            featureFlags: {
                'contact-data-model-update': false,
            },
        })
        expect(screen.getByText(/Wednesday Addams/)).toBeInTheDocument()
        expect(screen.queryByText(/Structured Contact Jr./)).toBeNull()
        expect(screen.getByText(/Writer/)).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'wedsaddams@example.com' })
        ).toBeInTheDocument()
    })

    it('renders the structured name when the contact model update flag is on', async () => {
        const contact: StateContact = {
            name: 'Legacy Name',
            givenName: 'Wednesday',
            familyName: 'Addams',
            suffix: 'Jr.',
            titleRole: 'Writer/Detective',
            email: `wedsaddams@example.com`,
        }
        renderWithProviders(<DataDetailContactField contact={contact} />, {
            featureFlags: {
                'contact-data-model-update': true,
            },
        })
        expect(
            await screen.findByText(/Wednesday Addams Jr./)
        ).toBeInTheDocument()
        expect(screen.queryByText(/Legacy Name/)).toBeNull()
    })

    it('renders the structured name and actuarial field when relevant', async () => {
        const contact: ActuaryContact = {
            name: 'Wednesday Addams',
            givenName: 'Wednesday',
            familyName: 'Addams',
            suffix: 'III',
            titleRole: 'Writer/Detective/Numbers Expert',
            email: `wedsaddams@example.com`,
            actuarialFirm: 'OTHER',
            actuarialFirmOther: 'All Black Incorporated',
        }
        renderWithProviders(<DataDetailContactField contact={contact} />, {
            featureFlags: {
                'contact-data-model-update': true,
            },
        })
        expect(
            await screen.findByText(/Wednesday Addams III/)
        ).toBeInTheDocument()
        expect(screen.getByText(/Numbers Expert/)).toBeInTheDocument()
        expect(
            screen.getByRole('link', { name: 'wedsaddams@example.com' })
        ).toBeInTheDocument()
        expect(screen.getByText(/All Black Incorporated/)).toBeInTheDocument()
    })
})
