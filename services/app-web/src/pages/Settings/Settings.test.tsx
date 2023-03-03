import React from 'react'
import { screen } from '@testing-library/react'
import { Settings } from './Settings'
import { indexUsersQueryMock } from '../../testHelpers/apolloMocks/indexUserQueryMock'
import { fetchCurrentUserMock } from '../../testHelpers/apolloMocks'
import { renderWithProviders } from '../../testHelpers'

describe('Settings', () => {
    it('should render the table with the correct columns and data', async () => {
        renderWithProviders(<Settings />, {
            apolloProvider: {
                mocks: [
                    indexUsersQueryMock(),
                    fetchCurrentUserMock({
                        statusCode: 200,
                    }),
                ],
            },
        })
        const familyNameCell = await screen.findByText('Hotman')
        const givenNameCell = await screen.findByText('Zuko')
        const emailCell = await screen.findByText('zuko@example.com')
        expect(familyNameCell).toBeInTheDocument()
        expect(givenNameCell).toBeInTheDocument()
        expect(emailCell).toBeInTheDocument()
    })
})
