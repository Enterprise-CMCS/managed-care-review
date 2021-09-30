import { render, screen } from '@testing-library/react'

import { DataDetail } from './'

describe('DataDetail', () => {
    it('renders without errors', () => {
        render(
            <DataDetail
                id="rainfall"
                label="Average rainfall in May"
                data="31.58"
            />
        )
        expect(
            screen.getByRole('definition', {
                name: 'Average rainfall in May',
            })
        ).toBeInTheDocument()
        expect(screen.getByText('31.58')).toBeInTheDocument()
    })

    it('renders an address component when passed in', () => {
        render(
            <DataDetail
                id="disney"
                label="Disney World Contact Info"
                data={
                    <address>
                        Mickey Mouse
                        <a href="mailto:mickey@disney.com">mickey@disney.com</a>
                        <a href="tel:555-555-5555">555-555-5555</a>
                    </address>
                }
            />
        )

        expect(
            screen.getByRole('definition', {
                name: 'Disney World Contact Info',
            })
        ).toBeInTheDocument()
        expect(screen.getByText('Mickey Mouse')).toBeInTheDocument()
        expect(screen.getAllByRole('link').length).toBe(2)
    })
})
