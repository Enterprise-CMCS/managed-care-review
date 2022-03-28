import { render, screen } from '@testing-library/react'
import { DownloadButton } from './DownloadButton'

describe('DownloadButton', () => {
    it('renders without errors', () => {
        render(
            <DownloadButton
                text="Download all documents"
                zippedFilesURL="https://example.com"
            />
        )
        expect(screen.getByRole('link', {name: 'Download all documents'})).toHaveClass(
            'usa-button usa-button--small'
        )
        expect(screen.getByText('Download all documents')).toBeInTheDocument()
    })
})
