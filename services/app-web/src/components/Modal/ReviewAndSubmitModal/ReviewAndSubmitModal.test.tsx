import React from 'react'
import { screen, render } from '@testing-library/react'
import { ReviewAndSubmitModal } from './ReviewAndSubmitModal';

describe('ReviewAndSubmitModal', () => {
    it('Renders element with modal hidden', () => {
        render(
            <div>
                <ReviewAndSubmitModal
                    id="hiddenModal"
                    modalTitle="Test Modal Title"
                    showModal={false}
                >
                    <textarea
                        id="textarea"
                        data-testid="textarea"
                    />
                </ReviewAndSubmitModal>

            </div>
        )

        expect(screen.getByRole('dialog')).toHaveClass('is-hidden')
    })

    it('Renders element with modal visible with modal title', () => {
        render(
            <div>
                <ReviewAndSubmitModal
                    id="hiddenModal"
                    modalTitle="Test Modal Title"
                    showModal={true}
                >
                    <textarea
                        id="textarea"
                        data-testid="textarea"
                    />
                </ReviewAndSubmitModal>
            </div>
        )

        expect(screen.getByRole('dialog')).toHaveClass('is-visible')
        expect(screen.getByText('Test Modal Title')).toBeInTheDocument()
        expect(screen.getByTestId('textarea')).toBeInTheDocument()
    })

    it('Renders element with modal visible without title', async() => {
        render(
            <div>
                <ReviewAndSubmitModal
                    id="hiddenModal"
                    showModal={true}
                >
                    <textarea
                        id="textarea"
                        data-testid="textarea"
                    />
                </ReviewAndSubmitModal>
            </div>
        )

        expect(screen.getByRole('dialog')).toHaveClass('is-visible')
        expect(screen.queryByText('Test Modal Title')).toBeNull()
        expect(screen.getByTestId('textarea')).toBeInTheDocument()
    })
})
