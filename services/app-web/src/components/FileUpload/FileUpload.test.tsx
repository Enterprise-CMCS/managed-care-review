import { render, waitFor, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FileUpload, FileUploadProps, S3FileData } from './FileUpload'
import { FileItemT } from './FileProcessor/FileProcessor'
import { SPACER_GIF } from './constants'
import {
    TEST_DOC_FILE,
    TEST_PDF_FILE,
    TEST_PNG_FILE,
    TEST_TEXT_FILE,
    TEST_VIDEO_FILE,
    dragAndDrop,
    fakeRequest,
    userClickByRole,
} from '../../testHelpers/jestHelpers'

describe('FileUpload component', () => {
    const testProps: FileUploadProps = {
        id: 'Default',
        name: 'Default Input',
        label: 'File input label',
        uploadFile: (file: File) =>
            fakeRequest<S3FileData>(true, {
                key: 'testtest',
                s3URL: 'fakeS3url',
            }),
        deleteFile: async (key: string) => {
            await fakeRequest<S3FileData>(true, {
                key: 'testtest',
                s3URL: 'fakeS3url',
            })
            return
        },
        scanFile: async (key: string) => {
            await fakeRequest<S3FileData>(true, {
                key: 'testtest',
                s3URL: 'fakeS3url',
            })
            return
        },
        onFileItemsUpdate: () => {
            return
        },
        renderMode: 'list',
    }
    beforeEach(() => jest.clearAllMocks())
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
                documentCategories: [],
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

    it('renders a loading state while file is loading', async () => {
        render(<FileUpload {...testProps} />)
        const inputEl = screen.getByTestId('file-input-input')
        userEvent.upload(inputEl, TEST_PDF_FILE)
        await screen.findByText(/Uploading/)

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).toHaveClass('is-loading')
        expect(imageEl).toHaveAttribute('src', SPACER_GIF)
    })

    it('moves to scanning state when file is finished loading', async () => {
        render(<FileUpload {...testProps} />)
        const inputEl = screen.getByTestId('file-input-input')
        userEvent.upload(inputEl, TEST_PDF_FILE)
        await screen.findByText(/Uploading/)
        await screen.findByText(/Scanning/)

        expect(screen.queryByText(/Uploading/)).toBeNull()
        expect(screen.getByTestId('file-input-preview-image')).toHaveClass(
            'is-loading'
        )
    })

    it('removes loading and scanning styles when file is complete', async () => {
        render(<FileUpload {...testProps} />)
        const inputEl = screen.getByTestId('file-input-input')
        userEvent.upload(inputEl, TEST_PDF_FILE)

        await screen.findByText(/Uploading/)
        await screen.findByText(/Scanning/)

        await waitFor(() => {
            expect(screen.queryByText(/Uploading/)).toBeNull()
            expect(screen.queryByText(/Scanning/)).toBeNull()
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

    it('displays a duplicate file error when expected', async () => {
        await render(<FileUpload {...testProps} accept=".pdf,.txt" />)

        const input = screen.getByTestId('file-input-input')
        userEvent.upload(input, [TEST_DOC_FILE])
        userEvent.upload(input, [TEST_PDF_FILE])
        userEvent.upload(input, [TEST_DOC_FILE])

        await waitFor(() => {
            expect(screen.queryAllByText(TEST_PDF_FILE.name).length).toBe(1)
            expect(screen.queryAllByText(TEST_DOC_FILE.name).length).toBe(2)
            expect(screen.queryAllByText('Duplicate file, please remove').length).toBe(1)
        })
    })

    it('calls uploadFile, scanFile and onFileItemsUpdate when file is successfully added', async () => {
        const props: FileUploadProps = {
            id: 'Default',
            name: 'Default Input',
            label: 'File input label',
            uploadFile: jest
                .fn()
                .mockResolvedValue({ key: '12313', s3Url: 's3:/12313' }),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            scanFile: jest.fn().mockResolvedValue(undefined),
            onFileItemsUpdate: jest.fn().mockResolvedValue(undefined),
            accept: '.pdf,.txt',
            renderMode: 'list',
        }

        render(<FileUpload {...props} />)

        const input = screen.getByTestId('file-input-input')
        userEvent.upload(input, [TEST_PDF_FILE])
        await waitFor(() => {
            expect(props.uploadFile).toHaveBeenCalled()
            expect(props.scanFile).toHaveBeenCalled()
            expect(props.onFileItemsUpdate).toHaveBeenCalled()
            expect(props.deleteFile).not.toHaveBeenCalled()
        })
    })

    it('calls uploadFile, scanFile, deleteFile when file scanning fails', async () => {
        const props: FileUploadProps = {
            id: 'Default',
            name: 'Default Input',
            label: 'File input label',
            uploadFile: jest
                .fn()
                .mockResolvedValue({ key: '12313', s3Url: 's3:/12313' }),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            scanFile: jest.fn().mockRejectedValue(new Error('failed')),
            onFileItemsUpdate: jest.fn().mockResolvedValue(undefined),
            accept: '.pdf,.txt',
            renderMode: 'list',
        }

        render(<FileUpload {...props} />)

        const input = screen.getByTestId('file-input-input')
        userEvent.upload(input, [TEST_PDF_FILE])
        await waitFor(() => {
            expect(props.uploadFile).toHaveBeenCalled()
            expect(props.scanFile).toHaveBeenCalled()
            expect(props.deleteFile).toHaveBeenCalled()
            expect(props.onFileItemsUpdate).toHaveBeenCalled()
        })
    })

    it('calls uploadFile again when failed scan is retried', async () => {
        const props: FileUploadProps = {
            id: 'Default',
            name: 'Default Input',
            label: 'File input label',
            uploadFile: jest
                .fn()
                .mockResolvedValue({ key: '12313', s3Url: 's3:/12313' }),
            deleteFile: jest.fn().mockResolvedValue(undefined),
            scanFile: jest.fn().mockRejectedValue(new Error('failed')),
            onFileItemsUpdate: jest.fn().mockResolvedValue(undefined),
            accept: '.pdf,.txt',
            renderMode: 'list',
        }

        render(<FileUpload {...props} />)

        const input = screen.getByTestId('file-input-input')
        userEvent.upload(input, [TEST_PDF_FILE])
        await waitFor(() => {
            expect(props.uploadFile).toHaveBeenCalled()
            expect(props.onFileItemsUpdate).toHaveBeenCalled()
        })

        userClickByRole(screen, 'button', { name: /Retry/ })
        await waitFor(() => expect(props.uploadFile).toHaveBeenCalled())
    })

    describe('list summary heading', () => {
        it('display list count - X files added', async () => {
            await render(<FileUpload {...testProps} accept=".pdf,.txt" />)

            const input = screen.getByTestId('file-input-input')
            userEvent.upload(input, [TEST_DOC_FILE])
            userEvent.upload(input, [TEST_PDF_FILE])
            await waitFor(() =>
                expect(screen.getByText(/2 files added/)).toBeInTheDocument()
            )
        })
    })
    describe('drag and drop behavior', () => {
        it('does not accept a drop file that has an invalid type', async () => {
            const { getByTestId, queryByTestId } = render(
                <FileUpload {...testProps} accept=".pdf" />
            )

            const inputEl = getByTestId('file-input-input')
            expect(inputEl).toHaveAttribute('accept', '.pdf')

            const targetEl = getByTestId('file-input-droptarget')
            dragAndDrop(targetEl, [TEST_PNG_FILE])

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
            dragAndDrop(targetEl, [TEST_PDF_FILE, TEST_PNG_FILE])

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
    })
})
