import { screen } from '@testing-library/react'
import { FormContainer } from './FormContainer'
import { renderWithProviders } from '../../testHelpers'

describe('FormContainer', () => {
    it('render children and custom classses on container element', () => {
        renderWithProviders(
            <FormContainer id="hasTestID" className="test-class">
                <h1>test heading</h1>
            </FormContainer>
        )
        expect(
            screen.getByRole('heading', {
                name: 'test heading',
            })
        ).toBeInTheDocument()
        expect(screen.getByTestId('hasTestID')).toBeInTheDocument()
        expect(screen.getByTestId('hasTestID')).toHaveClass('test-class')
    })
})
