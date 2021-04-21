import React from 'react'
import { screen, waitFor } from '@testing-library/react'

import { renderWithProviders } from '../../../utils/jestUtils'
import {
    fetchCurrentUserMock,
    createDraftSubmissionMock,
} from '../../../utils/apolloUtils'

import { Documents } from './Documents'

describe('Documents', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Documents
                id="23"
                name="foobar"
                uploadS3Files={() => Promise.resolve()}
                deleteS3Files={() => Promise.resolve()}
                onLoadComplete={() => Promise.resolve()}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('heading', { name: 'Documents' })
            ).toBeInTheDocument()
        )
    })

    it('accepts a new document', async () => {
        const testUpload = async () => {
            console.log('urplading')
            return
        }

        renderWithProviders(
            <Documents
                id="23"
                name="foobar"
                uploadS3Files={testUpload}
                deleteS3Files={() => Promise.resolve()}
                onLoadComplete={() => Promise.resolve()}
            />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() =>
            expect(
                screen.getByRole('heading', { name: 'efowienfowienf' })
            ).toBeInTheDocument()
        )
    })
})
