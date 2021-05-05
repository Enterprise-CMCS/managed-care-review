import React from 'react'
import { render, waitFor, screen } from '@testing-library/react'

import { FileUpload, FileUploadProps, S3FileData } from './FileUpload'
import { FileItemT } from './FileItem'
import { SPACER_GIF } from './constants'

const fakeApiRequest = (success: boolean): Promise<S3FileData> => {
    const timeout = Math.round(Math.random() * 4000 + 1000)
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve({ url: 'test', key: 'testtest', s3URL: 'fakeS3url' })
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
        onLoadComplete: () => console.log('stuff'),
    }

    it('renders without errors', async () => {
        await render(<FileUpload {...testProps} />)

        expect(screen.getByText('File input label')).toBeInTheDocument()
    })

    it('renders with initialItems already in file list', async () => {
        const initialItems: FileItemT[] = [
            {
                id: '3cef7a28-bd28-47d7-b838-ddd3bfb7d405',
                key:
                    '1620164967212-Trussel Guide to Truss - trussels-guide.pdf',
                name: 'Trussel Guide to Truss - trussels-guide.pdf',
                s3URL:
                    "s3://local-uploads/1620164967212-Trussels' Guide to Truss - trussels-guide.pdf/Trussels' Guide to Truss - trussels-guide.pdf",
                status: 'UPLOAD_COMPLETE',
                url:
                    'http://localhost:4569/local-uploads/1620164967212-Trussels%27%20Guide%20to%20Truss%20-%20trussels-guide.pdf?AWSAccessKeyId=S3RV',
            },
        ]

        await render(<FileUpload {...testProps} initialItems={initialItems} />)

        const items = screen.getAllByRole('listitem')
        expect(items.length).toBe(1)
        expect(
            screen.getByText('Trussel Guide to Truss - trussels-guide.pdf')
        ).toBeInTheDocument()
    })
    it.todo('shows duplicate name error when the same file is uploaded twice')

    it.todo('removes  duplicate name error when a duplicate file is deleted')
    it.todo(
        'show last file in list as invalid when multiple duplicate files loaded'
    )
    it.todo(
        'displays file upload state when duplicate name error for file is resolved'
    )
    // describe('while the file is loading', () => {
    //     it('renders a loading image', async () => {
    //         await render(<FileUpload {...testProps} />)
    //         const imageEl = screen.getByTestId('file-input-preview-image')
    //         expect(imageEl).toHaveClass('is-loading')
    //         expect(imageEl).toHaveAttribute('src', SPACER_GIF)
    //     })
    // })

    // describe('when the file is done loading', () => {
    //     it('renders the file preview image and removes the loading class', async () => {
    //         render(<FileUpload {...testProps} />)
    //
    //         const imageEl = screen.getByTestId('file-input-preview-image')
    //         await waitFor(() => expect(imageEl).not.toHaveClass('is-loading'))
    //     })
    // })
})
