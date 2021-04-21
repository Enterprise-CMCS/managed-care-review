import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '../../../utils/jestUtils'
import {
    fetchCurrentUserMock,
    mockDraftSubmission,
    updateDraftSubmissionMock,
} from '../../../utils/apolloUtils'

import { Documents } from './Documents'
// const TEST_TEXT_FILE = new File(['Test File Contents'], 'testFile.txt', {
//     type: 'text/plain',
// })

// const TEST_PDF_FILE = new File(['Test PDF File'], 'testFile.pdf', {
//     type: 'application/pdf',
// })

const TEST_DOC_FILE = new File(['Test doc File'], 'testFile.doc', {
    type: 'application/msword',
})

// const TEST_XLS_FILE = new File(['Test xls File'], 'testFile.xls', {
//     type: 'application/vnd.ms-excel',
// })

describe('Documents', () => {
    it('renders without errors', async () => {
        renderWithProviders(
            <Documents draftSubmission={mockDraftSubmission} />,
            {
                apolloProvider: {
                    mocks: [fetchCurrentUserMock({ statusCode: 200 })],
                },
            }
        )

        await waitFor(() => {
            expect(
                screen.getByRole('heading', { name: 'Documents' })
            ).toBeInTheDocument()

            expect(screen.getByTestId('file-input')).toBeInTheDocument()
            expect(screen.getByTestId('file-input')).toHaveClass(
                'usa-file-input'
            )
        })
    })

    it('accepts a new document', async () => {
        renderWithProviders(
            <Documents draftSubmission={mockDraftSubmission} />,
            {
                apolloProvider: {
                    mocks: [
                        fetchCurrentUserMock({ statusCode: 200 }),
                        updateDraftSubmissionMock({
                            id: mockDraftSubmission.id,
                            updates: {
                                ...mockDraftSubmission,
                                documents: [
                                    {
                                        url: 'https://www.example.com',
                                        name: 'test.txt',
                                    },
                                ],
                            },
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )

        const input = screen.getByLabelText('Upload Documents')
        expect(input).toBeInTheDocument()
        userEvent.upload(input, [TEST_DOC_FILE])
        expect(screen.getByText(TEST_DOC_FILE.name)).toBeInTheDocument()

        userEvent.click(
            screen.getByRole('button', {
                name: 'Continue',
            })
        )
        // expect it goes to the next page
    })
})
