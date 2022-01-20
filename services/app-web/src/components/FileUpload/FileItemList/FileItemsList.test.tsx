import React from 'react'
import { render, screen } from '@testing-library/react'
import renderer from 'react-test-renderer'
import userEvent from '@testing-library/user-event'

import { FileItemT } from '../FileItem/FileItem'
import { FileItemsList } from './FileItemsList'
import { TEST_PDF_FILE } from '../../../testHelpers/jestHelpers'

describe('FileItemList component', () => {
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

    const complete: FileItemT = {
        id: 'testFile4',
        file: TEST_PDF_FILE,
        name: 'testFile4.pdf',
        key: '4545454-testFile4',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile4',
        status: 'UPLOAD_COMPLETE',
    }

    const duplicateError: FileItemT = {
        id: 'testFile44',
        file: TEST_PDF_FILE,
        name: 'testFile4.pdf',
        key: '1234545454-testFile4',
        s3URL: 'tests3://uploaded-12313123213/1234545454-testFile4',
        status: 'DUPLICATE_NAME_ERROR',
    }
    const buttonActionProps = {
        deleteItem: jest.fn(),
        retryItem: jest.fn(),
    }

    beforeEach(() => jest.clearAllMocks())
    it('renders without errors', () => {
        const fileItems = [pending, uploadError]
        render(
            <FileItemsList
                renderMode="list"
                fileItems={fileItems}
                {...buttonActionProps}
            />
        )

        expect(screen.getAllByRole('listitem').length).toEqual(fileItems.length)
        expect(screen.getByText(/testFile.pdf/)).toBeInTheDocument()
        expect(screen.getByText('testFile2.pdf')).toBeInTheDocument()
    })

    it('renders correctly', () => {
        const fileItems = [
            pending,
            uploadError,
            scanningError,
            complete,
            duplicateError,
        ]
        const tree = renderer
            .create(
                <FileItemsList
                    renderMode="list"
                    fileItems={fileItems}
                    {...buttonActionProps}
                />
            )
            .toJSON()
        expect(tree).toMatchSnapshot()
    })

    it('button actions work as expected', () => {
        const fileItems = [uploadError]
        render(
            <FileItemsList
                renderMode="list"
                fileItems={fileItems}
                {...buttonActionProps}
            />
        )

        userEvent.click(screen.getByRole('button', { name: 'Retry' }))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByRole('button', { name: 'Remove' }))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('displays error styles for items that have errors', () => {
        const fileItems = [
            pending,
            uploadError,
            scanningError,
            complete,
            duplicateError,
            scanning,
        ]
        render(
            <FileItemsList
                renderMode="list"
                fileItems={fileItems}
                {...buttonActionProps}
            />
        )

        const listItems = screen.getAllByRole('listitem')
        const loadingListItem = listItems[0]
        const uploadErrorListItem = listItems[1]
        const scanningErrorListItem = listItems[2]
        const completeListItem = listItems[3]
        const duplicateErrorListItem = listItems[4]
        const scanningListItem = listItems[5]

        // Items not in error state
        expect(loadingListItem).toHaveClass('usa-file-input__preview')
        expect(scanningListItem).toHaveClass('usa-file-input__preview')
        expect(completeListItem).toHaveClass('usa-file-input__preview')

        // Items in an error state
        expect(uploadErrorListItem).not.toHaveClass('usa-file-input__preview')
        expect(uploadErrorListItem).toHaveClass(
            'bg-secondary-lighter border-secondary '
        )
        expect(scanningErrorListItem).not.toHaveClass('usa-file-input__preview')
        expect(scanningErrorListItem).toHaveClass(
            'bg-secondary-lighter border-secondary '
        )
        expect(completeListItem).toHaveClass('usa-file-input__preview')
        expect(duplicateErrorListItem).not.toHaveClass(
            'usa-file-input__preview'
        )
        expect(duplicateErrorListItem).toHaveClass(
            'bg-secondary-lighter border-secondary '
        )
    })
})
