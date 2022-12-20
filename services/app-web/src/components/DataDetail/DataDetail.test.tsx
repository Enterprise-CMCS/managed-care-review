import { render, screen } from '@testing-library/react'

import { DataDetail } from './DataDetail'

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
        expect(screen.getAllByRole('link')).toHaveLength(2)
    })

    it('renders helpful text when explainMissingData prop is true and no data passed in', () => {
        render(
            <DataDetail
                id="disney"
                label="Disney World's Best Attraction"
                data={undefined}
                explainMissingData={true}
            />
        )

        expect(
            screen.getByText(/You must provide this information/)
        ).toBeInTheDocument()
    })

    it('renders data when explainMissingData prop is true and valid data is passed in', () => {
        render(
            <DataDetail
                id="disney"
                label="Disney World's Best Attraction"
                data="The teacups"
                explainMissingData={true}
            />
        )
        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
        expect(screen.getByText(/teacups/)).toBeInTheDocument()
    })
    it('renders nothing when explainMissingData prop is false/missing and no data passed in', () => {
        const { container } = render(
            <DataDetail
                id="disney"
                label="Disney World Contact Info"
                data={undefined}
            />
        )

        expect(
            screen.queryByText(/You must provide this information/)
        ).toBeNull()
        expect(container).toBeEmptyDOMElement()
    })
})
