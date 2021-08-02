import React from 'react'
import { screen, render } from '@testing-library/react'
import { DynamicStepIndicator } from './DynamicStepIndicator'

describe('DynamicStepIndicator component', () => {
    it('renders without errors', async () => {
        render(<DynamicStepIndicator delayMS={0} />)

        expect(await screen.findByText('Loading')).toBeInTheDocument()
    })
})
