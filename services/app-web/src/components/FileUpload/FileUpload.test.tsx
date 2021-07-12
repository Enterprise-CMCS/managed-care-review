import React from 'react'
import { render, waitFor, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FileUpload, FileUploadProps, S3FileData } from './FileUpload'
import { FileItemT } from './FileItem'
import { SPACER_GIF } from './constants'
import {
    TEST_PDF_FILE,
    TEST_PNG_FILE,
    TEST_TEXT_FILE,
    TEST_VIDEO_FILE,
} from '../../testHelpers/jestHelpers'

const fakeApiRequest = (success: boolean): Promise<S3FileData> => {
    const timeout = Math.round(Math.random() * 1000)
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve({ key: 'testtest', s3URL: 'fakeS3url' })
            } else {
                reject(new Error('Error'))
            }
        }, timeout)
    })
}

describe('FileUpload component', () => {
    const testProps: FileUploadProps = {
        id: 'Default',
        name: 'Default Input',
        label: 'File input label',
        uploadFile: (file: File) => fakeApiRequest(true),
        deleteFile: async (key: string) => {
            await fakeApiRequest(true)
            return
        },
        onLoadComplete: () => {
            /*nothing*/
        },
    }

    it('renders without errors', async () => {
        await render(<FileUpload {...testProps} />)
        expect(screen.getByTestId('file-input')).toBeInTheDocument()
        expect(screen.getByTestId('file-input')).toHaveClass('usa-file-input')
        expect(screen.getByText('File input label')).toBeInTheDocument()
    })

    it('renders with initial items in file list', async () => {
        const initialItems: FileItemT[] = [
            {
                id: '3cef7a28-bd28-47d7-b838-ddd3bfb7d405',
                key: '1620164967212-Trussel Guide to Truss - trussels-guide.pdf',
                name: 'Trussel Guide to Truss - trussels-guide.pdf',
                s3URL: "s3://local-uploads/1620164967212-Trussels' Guide to Truss - trussels-guide.pdf/Trussels' Guide to Truss - trussels-guide.pdf",
                status: 'UPLOAD_COMPLETE',
            },
        ]

        await render(<FileUpload {...testProps} initialItems={initialItems} />)

        // check for initial items
        const items = screen.getAllByRole('listitem')
        expect(items.length).toBe(1)
        expect(
            screen.getByText('Trussel Guide to Truss - trussels-guide.pdf')
        ).toBeInTheDocument()

        // add another file
        const inputEl = screen.getByTestId('file-input-input')
        userEvent.upload(inputEl, TEST_PDF_FILE)

        expect(screen.getAllByRole('listitem').length).toBe(2)
        expect(
            screen.getByText('Trussel Guide to Truss - trussels-guide.pdf')
        ).toBeInTheDocument()
        expect(screen.getByText('testFile.pdf')).toBeInTheDocument()
    })

    it('renders a loading image while file is loading', async () => {
        render(<FileUpload {...testProps} />)
        const inputEl = screen.getByTestId('file-input-input')
        userEvent.upload(inputEl, TEST_PDF_FILE)

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).toHaveClass('is-loading')
        expect(imageEl).toHaveAttribute('src', SPACER_GIF)
    })

    it('removes loading state when file is finished loading', async () => {
        render(<FileUpload {...testProps} />)
        const inputEl = screen.getByTestId('file-input-input')
        userEvent.upload(inputEl, TEST_PDF_FILE)

        await waitFor(() => {
            expect(
                screen.getByTestId('file-input-preview-image')
            ).not.toHaveClass('is-loading')
            expect(screen.getByTestId('file-input-preview-image')).toHaveClass(
                'usa-file-input__preview-image--pdf'
            )
        })
    })

    it('accepts multiple files', async () => {
        await render(<FileUpload {...testProps} />)

        const inputEl = screen.getByTestId('file-input-input')

        userEvent.upload(
            inputEl,
            [TEST_TEXT_FILE, TEST_PDF_FILE],
            {},
            { applyAccept: true }
        )

        await waitFor(() => {
            expect(screen.getAllByRole('listitem').length).toBe(2)
            expect(
                screen.queryByTestId('file-input-error')
            ).not.toBeInTheDocument()
        })
    })

    it('accepts an upload file of a valid type', async () => {
        await render(<FileUpload {...testProps} accept=".pdf,.txt" />)

        const inputEl = screen.getByTestId('file-input-input')
        expect(inputEl).toHaveAttribute('accept', '.pdf,.txt')

        userEvent.upload(inputEl, TEST_PDF_FILE, {}, { applyAccept: true })

        expect(screen.queryByTestId('file-input-error')).not.toBeInTheDocument()
        expect(screen.getByTestId('file-input-droptarget')).not.toHaveClass(
            'has-invalid-file'
        )
        expect(screen.getByRole('listitem')).toBeInTheDocument()
    })

    it('does not accept upload file of invalid type', async () => {
        await render(<FileUpload {...testProps} accept=".pdf,.txt" />)

        const inputEl = screen.getByTestId('file-input-input')
        expect(inputEl).toHaveAttribute('accept', '.pdf,.txt')

        userEvent.upload(inputEl, TEST_VIDEO_FILE, {}, { applyAccept: true })

        expect(screen.queryByRole('listitem')).toBeNull()
    })

    it.todo('displays a duplicate file error when expected')
    // expect(screen.getByText('Duplicate file')).toBeInTheDocument()

    describe('drag and drop behavior', () => {
        it.todo('accepts an drop of a valid type')

        it('does not accept a drop file that has an invalid type', async () => {
            const { getByTestId, queryByTestId } = render(
                <FileUpload {...testProps} accept=".pdf" />
            )

            const inputEl = getByTestId('file-input-input')
            expect(inputEl).toHaveAttribute('accept', '.pdf')

            const targetEl = getByTestId('file-input-droptarget')
            fireEvent.drop(targetEl, {
                dataTransfer: {
                    files: [TEST_PNG_FILE],
                },
            })

            expect(getByTestId('file-input-error')).toHaveTextContent(
                'This is not a valid file type'
            )
            expect(getByTestId('file-input-error')).toHaveClass(
                'usa-file-input__accepted-files-message'
            )
            expect(getByTestId('file-input-droptarget')).toHaveClass(
                'has-invalid-file'
            )

            expect(queryByTestId('file-input-preview')).not.toBeInTheDocument()
        })

        it('does not accept a drop that has valid and invalid files together', () => {
            const { getByTestId, queryByTestId } = render(
                <FileUpload {...testProps} accept=".pdf" />
            )

            const inputEl = getByTestId('file-input-input')
            expect(inputEl).toHaveAttribute('accept', '.pdf')

            const targetEl = getByTestId('file-input-droptarget')
            fireEvent.drop(targetEl, {
                dataTransfer: {
                    files: [TEST_PDF_FILE, TEST_PNG_FILE],
                },
            })

            expect(getByTestId('file-input-error')).toHaveTextContent(
                'This is not a valid file type'
            )
            expect(getByTestId('file-input-error')).toHaveClass(
                'usa-file-input__accepted-files-message'
            )
            expect(getByTestId('file-input-droptarget')).toHaveClass(
                'has-invalid-file'
            )

            expect(queryByTestId('file-input-preview')).not.toBeInTheDocument()
        })

        it.todo('displays a duplicate file error when expected')
    })
})
