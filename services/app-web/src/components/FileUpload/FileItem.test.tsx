import React from 'react'
import { render, waitFor, screen } from '@testing-library/react'

import { FileItem, FileItemProps } from './FileItem'

import { SPACER_GIF } from './constants'

describe('FileItem component', () => {
    const testProps: FileItemProps = {
        item: {
            id: 'testFile',
            name: 'testFile.pdf',
            url: undefined,
            key: undefined,
            status: 'PENDING',
        },
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        deleteItem: (id: string) => {},
    }

    it('renders without errors', async () => {
        await render(<FileItem {...testProps} />)

        expect(screen.getByText(testProps.item.name)).toBeInTheDocument()
    })

    it('renders a preview image', async () => {
        await render(<FileItem {...testProps} />)
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).toHaveClass('usa-file-input__preview-image')
    })
})
