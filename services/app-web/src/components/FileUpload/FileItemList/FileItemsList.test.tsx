import React from 'react'
import { render, screen } from '@testing-library/react'
import renderer from 'react-test-renderer'
import userEvent from '@testing-library/user-event'

import { FileItemT } from '../FileProcessor/FileProcessor'
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
        documentCategories: ['CONTRACT_RELATED'],
    }
    const scanning: FileItemT = {
        id: 'testFile1',
        file: TEST_PDF_FILE,
        name: 'testFile1.pdf',
        key: '4545454-testFile1',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile1',
        status: 'SCANNING',
        documentCategories: [],
    }
    const uploadError: FileItemT = {
        id: 'testFile2',
        file: TEST_PDF_FILE,
        name: 'testFile2.pdf',
        key: undefined,
        s3URL: undefined,
        status: 'UPLOAD_ERROR',
        documentCategories: ['CONTRACT_RELATED'],
    }

    const scanningError: FileItemT = {
        id: 'testFile3',
        file: TEST_PDF_FILE,
        name: 'testFile3.pdf',
        key: '4545454-testFile3',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile3',
        status: 'SCANNING_ERROR',
        documentCategories: [],
    }

    const complete: FileItemT = {
        id: 'testFile4',
        file: TEST_PDF_FILE,
        name: 'testFile4.pdf',
        key: '4545454-testFile4',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile4',
        status: 'UPLOAD_COMPLETE',
        documentCategories: ['CONTRACT_RELATED'],
    }

    const duplicateError: FileItemT = {
        id: 'testFile44',
        file: TEST_PDF_FILE,
        name: 'testFile4.pdf',
        key: '1234545454-testFile4',
        s3URL: 'tests3://uploaded-12313123213/1234545454-testFile4',
        status: 'DUPLICATE_NAME_ERROR',
        documentCategories: [],
    }
    const buttonActionProps = {
        deleteItem: jest.fn(),
        retryItem: jest.fn(),
    }

    const categoryCheckboxProps = {
        handleCheckboxClick: jest.fn(),
    }

    beforeEach(() => jest.clearAllMocks())
    it('renders a list without errors', () => {
        const fileItems = [pending, uploadError]
        render(
            <FileItemsList
                renderMode="list"
                fileItems={fileItems}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        expect(screen.getAllByRole('listitem').length).toEqual(fileItems.length)
        expect(screen.getByText(/testFile.pdf/)).toBeInTheDocument()
        expect(screen.getByText('testFile2.pdf')).toBeInTheDocument()
    })

    it('renders a table without errors', () => {
        const fileItems = [pending, uploadError]
        render(
            <FileItemsList
                renderMode="table"
                fileItems={fileItems}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        // the table has a header row so we need to add 1 to the length
        expect(screen.getAllByRole('row').length).toEqual(fileItems.length + 1)
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
                    {...categoryCheckboxProps}
                />
            )
            .toJSON()
        expect(tree).toMatchSnapshot()
    })

    it('button actions in a list work as expected', () => {
        const fileItems = [uploadError]
        render(
            <FileItemsList
                renderMode="list"
                fileItems={fileItems}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        userEvent.click(screen.getByRole('button', { name: /Retry/ }))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByRole('button', { name: /Remove/ }))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('button actions in a table work as expected', () => {
        const fileItems = [uploadError]
        render(
            <FileItemsList
                renderMode="table"
                fileItems={fileItems}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        userEvent.click(screen.getByText('Retry'))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByText('Remove'))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('displays error styles for list items that have errors', () => {
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
                {...categoryCheckboxProps}
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

    it('displays error styles for table rows that have errors', () => {
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
                renderMode="table"
                fileItems={fileItems}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        const rows = screen.getAllByRole('row')
        const loadingRow = rows[1]
        const uploadErrorRow = rows[2]
        const scanningErrorRow = rows[3]
        const completeRow = rows[4]
        const duplicateErrorRow = rows[5]
        const scanningRow = rows[6]

        // Items not in error state
        expect(loadingRow).not.toHaveClass('bg-secondary-lighter')
        expect(scanningRow).not.toHaveClass('bg-secondary-lighter')
        expect(completeRow).not.toHaveClass('bg-secondary-lighter')

        // Items in an error state
        expect(uploadErrorRow).toHaveClass('bg-secondary-lighter')
        expect(scanningErrorRow).toHaveClass('bg-secondary-lighter')
        expect(duplicateErrorRow).toHaveClass('bg-secondary-lighter')
    })
})
