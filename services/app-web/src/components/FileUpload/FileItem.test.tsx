import React from 'react'
import { render, screen } from '@testing-library/react'

import { FileItem, FileItemT, FileItemProps } from './FileItem'
import userEvent from '@testing-library/user-event'
import { TEST_PDF_FILE } from '../../testHelpers/jestHelpers'

describe('FileItem component', () => {
    const mockRetry = jest.fn()
    const mockDelete = jest.fn()
    const testProps: FileItemProps = {
        item: {
            id: 'testFile',
            name: 'testFile.pdf',
            file: TEST_PDF_FILE,
            key: undefined,
            s3URL: undefined,
            status: 'PENDING',
        },
        deleteItem: (fileItem: FileItemT) => mockDelete(),
        retryItem: (fileItem: FileItemT) => mockRetry(),
    }

    it('renders without errors', () => {
        render(<FileItem {...testProps} />)

        expect(screen.getByText(testProps.item.name)).toBeInTheDocument()
    })

    it('displays loading image and remove button when status is loading', () => {
        render(<FileItem {...testProps} />)
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).toHaveClass('is-loading')
        expect(
            screen.getByRole('button', { name: 'Remove' })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    })

    it('displays file image and delete button when upload is success', () => {
        render(
            <FileItem
                item={{ ...testProps.item, status: 'UPLOAD_COMPLETE' }}
                retryItem={testProps.retryItem}
                deleteItem={testProps.deleteItem}
            />
        )
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(imageEl).toHaveClass('usa-file-input__preview-image--pdf')
        expect(
            screen.getByRole('button', { name: 'Remove' })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    })

    it('displays upload failed message when S3 upload fails, with retry and remove buttons', () => {
        render(
            <FileItem
                item={{ ...testProps.item, status: 'UPLOAD_ERROR' }}
                retryItem={testProps.retryItem}
                deleteItem={testProps.deleteItem}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Remove' })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Retry' })
        ).toBeInTheDocument()

        userEvent.click(screen.getByRole('button', { name: 'Retry' }))
        expect(mockRetry).toHaveBeenCalled()

        userEvent.click(screen.getByRole('button', { name: 'Remove' }))
        expect(mockDelete).toHaveBeenCalled()
    })

    it('displays upload failed message for unexpected error, with a remove button', () => {
        render(
            <FileItem
                item={{
                    ...testProps.item,
                    status: 'UPLOAD_ERROR',
                    file: undefined,
                }}
                retryItem={testProps.retryItem}
                deleteItem={testProps.deleteItem}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(screen.getByText('Upload failed')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Remove' })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()

        userEvent.click(screen.getByRole('button', { name: 'Remove' }))
        expect(mockDelete).toHaveBeenCalled()
    })

    it('displays duplicate name error message when expected, with a remove button', () => {
        render(
            <FileItem
                item={{ ...testProps.item, status: 'DUPLICATE_NAME_ERROR' }}
                retryItem={testProps.retryItem}
                deleteItem={testProps.deleteItem}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(screen.getByText('Duplicate file')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: 'Remove' })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()

        userEvent.click(screen.getByRole('button', { name: 'Remove' }))
        expect(mockDelete).toHaveBeenCalled()
    })
})
