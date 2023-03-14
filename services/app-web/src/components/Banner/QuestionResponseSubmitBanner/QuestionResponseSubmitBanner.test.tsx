import { render, screen } from '@testing-library/react'
import { QuestionResponseSubmitBanner } from './QuestionResponseSubmitBanner'

describe('QuestionResponseSubmitBanner', () => {
    it('renders without errors and correct text for a CMS question submit', () => {
        render(<QuestionResponseSubmitBanner submitType="question" />)
        expect(screen.getByTestId('alert')).toHaveClass('usa-alert--success')
        expect(screen.getByText('Questions sent')).toBeInTheDocument()
    })

    it('renders without errors and correct text for a state response', () => {
        render(<QuestionResponseSubmitBanner submitType="response" />)
        expect(screen.getByTestId('alert')).toHaveClass('usa-alert--success')
        expect(screen.getByText('Response sent')).toBeInTheDocument()
    })

    it('renders nothing if invalid submitType passed in URL params', () => {
        render(
            <div data-testid="test1">
                <QuestionResponseSubmitBanner submitType="errorweird" />
            </div>
        )
        expect(screen.getByTestId('test1')).toBeEmptyDOMElement()
    })
})
