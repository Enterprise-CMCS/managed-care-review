import { screen, render } from '@testing-library/react'
import { UploadErrorAlert } from './UploadErrorAlert'

describe('UploadErrorAlert component', () => {
    it('renders without errors', async () => {
        render(<UploadErrorAlert hasNoDocuments />)
        expect(await screen.findByRole('heading')).toBeInTheDocument()
    })

    it('displays expected alerts for missing documents', () => {
        render(<UploadErrorAlert hasNoDocuments />)

        expect(
            screen.getByRole('heading', { name: 'Missing documents' })
        ).toBeInTheDocument()
        expect(
            screen.getByText('You must upload at least one document')
        ).toBeInTheDocument()
    })

    it('displays expected alert for other generic errors', () => {
        render(<UploadErrorAlert />)
        expect(screen.getByText('Remove files with errors')).toBeInTheDocument()
    })
})
