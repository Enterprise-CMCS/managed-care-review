import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FileItem, FileItemT } from './FileItem'
import { TEST_PDF_FILE } from '../../../testHelpers/jestHelpers'

describe('FileItem component', () => {
    const pending: FileItemT = {
        id: 'testFile',
        file: TEST_PDF_FILE,
        name: 'testFile.pdf',
        key: undefined,
        s3URL: undefined,
        status: 'PENDING',
    }
    const scanning: FileItemT = {
        id: 'testFile1',
        file: TEST_PDF_FILE,
        name: 'testFile1.pdf',
        key: '4545454-testFile1',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile1',
        status: 'SCANNING',
    }
    const uploadError: FileItemT = {
        id: 'testFile2',
        file: TEST_PDF_FILE,
        name: 'testFile2.pdf',
        key: undefined,
        s3URL: undefined,
        status: 'UPLOAD_ERROR',
    }

    const scanningError: FileItemT = {
        id: 'testFile3',
        file: TEST_PDF_FILE,
        name: 'testFile3.pdf',
        key: '4545454-testFile3',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile3',
        status: 'SCANNING_ERROR',
    }

    const uploadComplete: FileItemT = {
        id: 'testFile4',
        file: TEST_PDF_FILE,
        name: 'testFile4.pdf',
        key: '4545454-testFile4',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile4',
        status: 'UPLOAD_COMPLETE',
    }

    const duplicateError: FileItemT = {
        id: 'testFile4',
        file: TEST_PDF_FILE,
        name: 'testFile4.pdf',
        key: '4545454-testFile4',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile4',
        status: 'DUPLICATE_NAME_ERROR',
    }

    const buttonActionProps = {
        deleteItem: jest.fn(),
        retryItem: jest.fn(),
    }

    beforeEach(() => jest.clearAllMocks())
    it('renders without errors', () => {
        render(
            <FileItem
                renderMode="list"
                item={uploadComplete}
                {...buttonActionProps}
            />
        )

        expect(screen.getByText(uploadComplete.name)).toBeInTheDocument()
    })

    it('includes appropriate aria- attributes', () => {
        render(
            <FileItem
                renderMode="list"
                item={uploadError}
                {...buttonActionProps}
            />
        )

        expect(
            screen.getByLabelText(
                `Retry upload for ${uploadError.name} document`
            )
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText(`Remove ${uploadError.name} document`)
        ).toBeInTheDocument()
    })

    it('button actions work as expected', () => {
        render(
            <FileItem
                renderMode="list"
                item={uploadError}
                {...buttonActionProps}
            />
        )

        userEvent.click(screen.getByRole('button', { name: /Retry/ }))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByRole('button', { name: /Remove/ }))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('displays loading image, loading text, and remove button when status is LOADING', () => {
        render(
            <FileItem renderMode="list" item={pending} {...buttonActionProps} />
        )
        expect(screen.getByText('Step 1 of 2: Uploading')).toBeInTheDocument()
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).toHaveClass('is-loading')
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('displays loading image, scanning text, and remove button when status is SCANNING', () => {
        render(
            <FileItem
                renderMode="list"
                item={scanning}
                {...buttonActionProps}
            />
        )
        expect(screen.getByText('Step 2 of 2: Scanning')).toBeInTheDocument()
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).toHaveClass('is-loading')
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('displays file image and remove button when status is UPLOAD_COMPLETE', () => {
        render(
            <FileItem
                renderMode="list"
                item={uploadComplete}
                {...buttonActionProps}
            />
        )
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(imageEl).toHaveClass('usa-file-input__preview-image--pdf')
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('displays upload failed message and both retry and remove buttons when status is UPLOAD_ERROR', () => {
        render(
            <FileItem
                renderMode="list"
                item={uploadError}
                {...buttonActionProps}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Retry/ })
        ).toBeInTheDocument()

        userEvent.click(screen.getByRole('button', { name: /Retry/ }))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByRole('button', { name: /Remove/ }))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('displays security scan failed message and  both retry and remove buttons when status is SCANNING_ERROR', () => {
        render(
            <FileItem
                renderMode="list"
                item={scanningError}
                {...buttonActionProps}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(
            screen.getByText('Failed security scan, please remove')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: /Retry/ })
        ).toBeInTheDocument()
    })

    it('displays duplicate name error message and remove button when status is DUPLICATE_NAME_ERROR', () => {
        render(
            <FileItem
                renderMode="list"
                item={duplicateError}
                {...buttonActionProps}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(screen.getByText('Duplicate file')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('displays unexpected error message and remove button when status is UPLOAD_ERROR but file reference is undefined (this is an unexpected state but it would mean the upload cannot be retried)', () => {
        render(
            <FileItem
                renderMode="list"
                item={{ ...uploadError, file: undefined }}
                {...buttonActionProps}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
        expect(
            screen.getByText('Unexpected error. Please remove.')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })
})
