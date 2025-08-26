import { mockContractPackageSubmitted } from '@mc-review/mocks'
import { renderWithProviders } from '../../testHelpers'
import { ZipDownloadLink } from './ZipDownloadLink'
import { screen } from '@testing-library/react'

describe('zip download link', () => {
    const contract = mockContractPackageSubmitted()

    it('renders without errors', () => {
        renderWithProviders(
            <ZipDownloadLink
                type={'CONTRACT'}
                documentZipPackages={
                    contract.packageSubmissions[0].contractRevision
                        .documentZipPackages!
                }
                documentCount={2}
            />
        )

        expect(screen.getByTestId('zipDownloadLink')).toBeInTheDocument()
    })

    it('renders the correct text for contracts', () => {
        renderWithProviders(
            <ZipDownloadLink
                type={'RATE'}
                documentZipPackages={
                    contract.packageSubmissions[0].rateRevisions[0]
                        .documentZipPackages!
                }
                documentCount={2}
            />
        )

        expect(
            screen.getByText('Download rate documents (2 files)')
        ).toBeInTheDocument()
    })

    it('renders the correct text for rates', () => {
        renderWithProviders(
            <ZipDownloadLink
                type={'CONTRACT'}
                documentZipPackages={
                    contract.packageSubmissions[0].contractRevision
                        .documentZipPackages!
                }
                documentCount={2}
            />
        )

        expect(
            screen.getByText('Download contract documents (2 files)')
        ).toBeInTheDocument()
    })

    it('renders singular version of document', () => {
        renderWithProviders(
            <ZipDownloadLink
                type={'CONTRACT'}
                documentZipPackages={
                    contract.packageSubmissions[0].contractRevision
                        .documentZipPackages!
                }
                documentCount={1}
            />
        )

        //'files' here should be singular not plural
        expect(
            screen.getByText('Download contract documents (1 file)')
        ).toBeInTheDocument()
    })
})
