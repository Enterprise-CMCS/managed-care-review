import { screen } from '@testing-library/react'
import { DownloadButton } from './DownloadButton'
import { renderWithProviders } from '../../testHelpers'

describe('DownloadButton', () => {
    it('renders without errors', () => {
        renderWithProviders(
            <DownloadButton
                text="Download all documents"
                zippedFilesURL="https://example.com"
            />
        )
        expect(
            screen.getByRole('link', { name: 'Download all documents' })
        ).toHaveClass('usa-button')
        expect(screen.getByText('Download all documents')).toBeInTheDocument()
    })
    it('renders loading button', () => {
        renderWithProviders(
            <DownloadButton
                text="Download all documents"
                zippedFilesURL={undefined}
            />
        )
        expect(screen.getByText('Loading')).toBeInTheDocument()
    })
})
