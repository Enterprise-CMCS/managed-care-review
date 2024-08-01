import React from 'react'
import { render } from '@testing-library/react'

import { PoliteErrorMessage } from './PoliteErrorMessage'

describe('PoliteErrorMessage component', () => {
    it('renders without errors', () => {
        const { queryByTestId } = render(
            <PoliteErrorMessage formFieldLabel={'test'}>
                Helpful error message
            </PoliteErrorMessage>
        )
        expect(queryByTestId('errorMessage')).toBeInTheDocument()
    })

    it('renders its children', () => {
        const { queryByText } = render(
            <PoliteErrorMessage formFieldLabel={'test'}>
                Helpful error message
            </PoliteErrorMessage>
        )
        expect(queryByText('Helpful error message')).toBeInTheDocument()
    })
})
