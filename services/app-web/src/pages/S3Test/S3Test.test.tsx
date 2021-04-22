import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '../../utils/jestUtils'
import { fetchCurrentUserMock } from '../../utils/apolloUtils'

import { S3Test } from './S3Test'

describe('S3Test', () => {
    it('renders without errors', async () => {
        renderWithProviders(<S3Test />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        await waitFor(() =>
            expect(screen.getByTestId('testS3Input')).toBeInTheDocument()
        )
    })

    it('uploads a document', async () => {
        renderWithProviders(<S3Test />, {
            apolloProvider: {
                mocks: [fetchCurrentUserMock({ statusCode: 200 })],
            },
        })

        const input = await screen.findByTestId('file-input-input')
        const file = new File(['hello'], 'hello.png', { type: 'image/png' })

        userEvent.upload(input, file)

        expect(
            await screen.findByText(/uploaded.*hello.png$/)
        ).toBeInTheDocument()
    })
})
