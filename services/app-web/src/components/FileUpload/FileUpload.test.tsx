import React from 'react'
import { render, waitFor, screen } from '@testing-library/react'

import { FileUpload, FileUploadProps, S3FileData } from './FileUpload'

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
