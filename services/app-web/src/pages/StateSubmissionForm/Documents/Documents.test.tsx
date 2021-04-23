import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderWithProviders } from '../../../utils/jestUtils'
import {
    fetchCurrentUserMock,
    mockDraftSubmission,
    updateDraftSubmissionMock,
} from '../../../utils/apolloUtils'

import { Documents } from './Documents'

const TEST_PDF_FILE = new File(['Test PDF File'], 'testFile.pdf', {
    type: 'application/pdf',
})

const TEST_DOC_FILE = new File(['Test doc File'], 'testFile.doc', {
    type: 'application/msword',
})

const TEST_XLS_FILE = new File(['Test xls File'], 'testFile.xls', {
    type: 'application/vnd.ms-excel',
})

const TEST_VIDEO_FILE = new File(['Test video File'], 'testFile.mp4', {
    type: 'video/mp4',
})

const TEST_PNG_FILE = new File(['Test PNG Image'], 'testFile.png', {
    type: 'image/png',
})

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
                                        s3URL: 'fakeS3URL',
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
    })

    it('accepts multiple pdf, word, excel documents', async () => {
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
                                        s3URL: 'fakeS3URL',
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
        expect(input).toHaveAttribute(
            'accept',
            'application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        userEvent.upload(input, [TEST_DOC_FILE, TEST_PDF_FILE, TEST_XLS_FILE])
        expect(screen.getByText(TEST_DOC_FILE.name)).toBeInTheDocument()
        expect(screen.getByText(TEST_PDF_FILE.name)).toBeInTheDocument()
        expect(screen.getByText(TEST_XLS_FILE.name)).toBeInTheDocument()
    })

    it('does not accept image files', async () => {
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
                                        s3URL: 'fakeS3URL',
                                    },
                                ],
                            },
                            statusCode: 200,
                        }),
                    ],
                },
            }
        )

        // drop documents because accept should not allow invalid documents to upload in the first place
        const targetEl = screen.getByTestId('file-input-droptarget')
        fireEvent.drop(targetEl, {
            dataTransfer: {
                files: [TEST_PNG_FILE, TEST_VIDEO_FILE],
            },
        })
        expect(screen.queryByText(TEST_PNG_FILE.name)).not.toBeInTheDocument()
        expect(screen.queryByText(TEST_VIDEO_FILE.name)).not.toBeInTheDocument()
        // expect(screen.getByTestId('file-input-error')).toHaveClass(
        //     'usa-file-input__accepted-files-message'
        // )
        // expect(screen.getByTestId('file-input-droptarget')).toHaveClass(
        //     'has-invalid-file'
        // )

        // expect(
        //     screen.getByText('This is not a valid file type')
        // ).toBeInTheDocument()
        expect(
            screen.queryByTestId('file-input-preview')
        ).not.toBeInTheDocument()
    })
})
