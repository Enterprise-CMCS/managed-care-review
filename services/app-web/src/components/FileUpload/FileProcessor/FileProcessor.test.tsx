import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FileProcessor, FileItemT } from './FileProcessor'
import { TEST_PDF_FILE } from '../../../testHelpers/jestHelpers'

describe('FileProcessor component', () => {
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
        documentCategories: [],
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

    const uploadComplete: FileItemT = {
        id: 'testFile4',
        file: TEST_PDF_FILE,
        name: 'testFile4.pdf',
        key: '4545454-testFile4',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile4',
        status: 'UPLOAD_COMPLETE',
        documentCategories: [],
    }

    const duplicateError: FileItemT = {
        id: 'testFile4',
        file: TEST_PDF_FILE,
        name: 'testFile4.pdf',
        key: '4545454-testFile4',
        s3URL: 'tests3://uploaded-12313123213/4545454-testFile4',
        status: 'DUPLICATE_NAME_ERROR',
        documentCategories: [],
    }

    const buttonActionProps = {
        deleteItem: jest.fn(),
        retryItem: jest.fn(),
    }

    const categoryCheckboxProps = {
        handleCheckboxClick: jest.fn(),
        shouldDisplayMissingCategoriesError: true
    }

    beforeEach(() => jest.clearAllMocks())
    it('renders a list without errors', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={uploadComplete}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        expect(screen.getByText(uploadComplete.name)).toBeInTheDocument()
    })

    it('renders a table without errors', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={uploadComplete}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        expect(screen.getByText(uploadComplete.name)).toBeInTheDocument()
    })

    it('includes appropriate aria- attributes in the list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={uploadError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        expect(
            screen.getByLabelText(
                `Retry upload for ${uploadError.name} document`
            )
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText(`Remove ${uploadError.name} document`)
        ).toBeInTheDocument()
    })

    it('includes appropriate aria- attributes in the table', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={uploadError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        expect(
            screen.getByLabelText(
                `Retry upload for ${uploadError.name} document`
            )
        ).toBeInTheDocument()
        expect(
            screen.getByLabelText(`Remove ${uploadError.name} document`)
        ).toBeInTheDocument()
    })

    it('button actions work as expected in the list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={uploadError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        userEvent.click(screen.getByRole('button', { name: /Retry/ }))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByRole('button', { name: /Remove/ }))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('button actions work as expected in the table', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={uploadError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        userEvent.click(screen.getByText('Retry'))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByText('Remove'))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('displays loading image, loading text, and remove button when status is LOADING in the list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={pending}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        expect(screen.getByText('Step 1 of 2: Uploading')).toBeInTheDocument()
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).toHaveClass('is-loading')
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('displays loading image, loading text, and remove button when status is LOADING in the table', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={pending}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        expect(screen.getByText('Step 1 of 2: Uploading')).toBeInTheDocument()
        expect(screen.getByText('Remove')).toBeInTheDocument()
        expect(screen.queryByText('Retry')).not.toBeInTheDocument()
    })

    it('displays loading image, scanning text, and remove button when status is SCANNING in the list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={scanning}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        expect(screen.getByText('Step 2 of 2: Scanning')).toBeInTheDocument()
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).toHaveClass('is-loading')
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('displays loading image, scanning text, and remove button when status is SCANNING in the table', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={scanning}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        expect(screen.getByText('Step 2 of 2: Scanning')).toBeInTheDocument()
        expect(screen.getByText('Remove')).toBeInTheDocument()
        expect(screen.queryByText('Retry')).not.toBeInTheDocument()
    })

    it('displays file image and remove button when status is UPLOAD_COMPLETE in a list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={uploadComplete}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(imageEl).toHaveClass('usa-file-input__preview-image--pdf')
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('has clickable document category checkboxes', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={uploadComplete}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        const contractCheckbox = screen.getByRole('checkbox', {
            name: 'contract-supporting',
        })
        const ratesCheckbox = screen.getByRole('checkbox', {
            name: 'rate-supporting',
        })
        userEvent.click(contractCheckbox)
        expect(categoryCheckboxProps.handleCheckboxClick).toHaveBeenCalledWith(
            expect.objectContaining({
                target: expect.objectContaining({
                    name: 'contract-supporting',
                }),
            })
        )
        userEvent.click(ratesCheckbox)
        expect(categoryCheckboxProps.handleCheckboxClick).toHaveBeenCalledWith(
            expect.objectContaining({
                target: expect.objectContaining({
                    name: 'rate-supporting',
                }),
            })
        )
    })

    it('does not have clickable document category checkboxes for a contract-only submission', () => {
        render(
            <FileProcessor
                renderMode="table"
                isContractOnly={true}
                item={uploadComplete}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        const contractCheckbox = screen.queryByRole('checkbox', {
            name: 'contract-supporting',
        })
        const ratesCheckbox = screen.queryByRole('checkbox', {
            name: 'rate-supporting',
        })
        expect(contractCheckbox).not.toBeInTheDocument()
        expect(ratesCheckbox).not.toBeInTheDocument()
    })

    it('displays the remove button when status is UPLOAD_COMPLETE in a table', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={uploadComplete}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        expect(screen.getByText('Remove')).toBeInTheDocument()
        expect(screen.queryByText('Retry')).not.toBeInTheDocument()
    })

    it('displays upload failed message and both retry and remove buttons when status is UPLOAD_ERROR in a list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={uploadError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(screen.getByText(/Upload failed/)).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Retry/ })
        ).toBeInTheDocument()

        userEvent.click(screen.getByRole('button', { name: /Retry/ }))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByRole('button', { name: /Remove/ }))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('displays upload failed message and both retry and remove buttons when status is UPLOAD_ERROR in a table', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={uploadError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        expect(screen.getByText(/Upload failed/)).toBeInTheDocument()
        expect(screen.getByText('Remove')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()

        userEvent.click(screen.getByText('Retry'))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByText('Remove'))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('displays security scan failed message and both retry and remove buttons when status is SCANNING_ERROR in a list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={scanningError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(
            screen.getByText('Failed security scan, please remove')
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('button', { name: /Retry/ })
        ).toBeInTheDocument()
    })

    it('displays security scan failed message and both retry and remove buttons when status is SCANNING_ERROR in a table', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={scanningError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        expect(
            screen.getByText('Failed security scan, please remove')
        ).toBeInTheDocument()
        expect(screen.getByText('Remove')).toBeInTheDocument()
        expect(screen.getByText('Retry')).toBeInTheDocument()

        userEvent.click(screen.getByText('Retry'))
        expect(buttonActionProps.retryItem).toHaveBeenCalled()

        userEvent.click(screen.getByText('Remove'))
        expect(buttonActionProps.deleteItem).toHaveBeenCalled()
    })

    it('displays duplicate name error message and remove button when status is DUPLICATE_NAME_ERROR in a list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={duplicateError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('bg-error-lighter g')
        expect(screen.getByText('Duplicate file, please remove')).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('displays duplicate name error message and remove button when status is DUPLICATE_NAME_ERROR in a table', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={duplicateError}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        expect(screen.getByText('Duplicate file, please remove')).toBeInTheDocument()
        expect(screen.getByText('Remove')).toBeInTheDocument()
        expect(screen.queryByText('Retry')).not.toBeInTheDocument()
    })


    it('displays document categories error with checkboxes when expected (in table view)', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={{ ...uploadComplete, documentCategories: [] }}
                {...buttonActionProps}
                {...categoryCheckboxProps}
                isContractOnly={false}
            />
        )

         const contractCheckbox = screen.queryByRole('checkbox', {
             name: 'contract-supporting',
         })
         const ratesCheckbox = screen.queryByRole('checkbox', {
             name: 'rate-supporting',
         })
        const itemTableRow = screen.getByRole('row')
        expect(itemTableRow).toHaveClass('bg-error-lighter warningRow')
                
         expect(contractCheckbox).toBeInTheDocument()
         expect(ratesCheckbox).toBeInTheDocument()
  
        expect(screen.getByText(/Must select at least one category checkbox/)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

      it('does not display document categories error when expected (relevant in table view before validation)', () => {
          render(
              <FileProcessor
                  renderMode="table"
                  item={{ ...uploadComplete}}
                  {...buttonActionProps}
                  {...categoryCheckboxProps}
                  shouldDisplayMissingCategoriesError={false}
              />
          )

        const itemTableRow = screen.getByRole('row')
        expect(itemTableRow).not.toHaveClass('bg-error-lighter warningRow')
        
        expect(
              screen.queryByText(/Must select at least one category checkbox/)
          ).not.toBeInTheDocument()
      })



    it('displays unexpected error message and remove button when status is UPLOAD_ERROR but file reference is undefined (this is an unexpected state but it would mean the upload cannot be retried) in a list', () => {
        render(
            <FileProcessor
                renderMode="list"
                item={{ ...uploadError, file: undefined }}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )

        const imageEl = screen.getByTestId('file-input-preview-image')
        expect(imageEl).not.toHaveClass('is-loading')
        expect(
            screen.getByText(/Unexpected error/)
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button', { name: /Remove/ })
        ).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull()
    })

    it('displays unexpected error message and remove button when status is UPLOAD_ERROR but file reference is undefined (this is an unexpected state but it would mean the upload cannot be retried) in a table', () => {
        render(
            <FileProcessor
                renderMode="table"
                item={{ ...uploadError, file: undefined }}
                {...buttonActionProps}
                {...categoryCheckboxProps}
            />
        )
        expect(
            screen.getByText(/Unexpected error/)
        ).toBeInTheDocument()
        expect(screen.getByText('Remove')).toBeInTheDocument()
        expect(screen.queryByText('Retry')).not.toBeInTheDocument()
    })
})
