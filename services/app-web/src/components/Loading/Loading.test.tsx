import React from 'react'
import { screen, render } from '@testing-library/react'
import { Loading } from './Loading'

describe('Loading component', () => {
    it('renders without errors', async () => {
        render(<Loading delayMS={0} />)

        expect(await screen.findByText('Loading')).toBeInTheDocument()
    })
})
