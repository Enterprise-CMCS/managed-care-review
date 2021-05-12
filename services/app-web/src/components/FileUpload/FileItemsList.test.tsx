import React from 'react'
import { render, screen } from '@testing-library/react'

import { FileItemT } from './FileItem'
import { FileItemsList } from './FileItemsList'

describe('FileItem component', () => {
    const testProps = {
        fileItems: [
            {
                id: 'testFile1',
                name: 'testFile1.pdf',
                url: undefined,
                key: undefined,
                s3URL: undefined,
                status: 'PENDING',
            },
            {
                id: 'testFile2',
                name: 'testFile2.pdf',
                url: undefined,
                key: undefined,
                s3URL: undefined,
                status: 'UPLOAD_ERROR',
            },
        ] as FileItemT[],
        deleteItem: (fileItem: FileItemT) => {
            /* delete item*/
        },
        retryItem: (fileItem: FileItemT) => {
            /* retry item*/
        },
    }

    it('renders without errors', () => {
        render(<FileItemsList {...testProps} />)

        expect(screen.getAllByRole('listitem').length).toEqual(
            testProps.fileItems.length
        )
        expect(screen.getByText('testFile1.pdf')).toBeInTheDocument()
        expect(screen.getByText('testFile2.pdf')).toBeInTheDocument()
    })

    it('displays error styles for items that have errors', () => {
        render(<FileItemsList {...testProps} />)
        const listItems = screen.getAllByRole('listitem')
        expect(listItems[0]).toHaveClass('usa-file-input__preview')
        expect(listItems[1]).not.toHaveClass('usa-file-input__preview')
        expect(listItems[1]).toHaveClass(
            'bg-secondary-lighter border-secondary '
        )
    })
})
