import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpandableText } from './ExpandableText'

describe('ExpandableText', () => {
    type NodeWidth = Pick<
        HTMLDivElement,
        'offsetWidth' | 'scrollWidth' | 'offsetHeight' | 'scrollHeight'
    > & { style: { webkitLineClamp: string } }

    //Blog post about this helper https://dev.to/tmikeschu/testing-element-dimensions-without-the-browser-5532
    const setMockRefElement = (node: NodeWidth): void => {
        const mockRef = {
            get current() {
                // jest dom elements have no width,
                // so mocking a browser situation
                return node
            },
            // we need a setter here because it gets called when you
            // pass a ref to <component ref={ref} />
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            set current(_value) {},
        }
        jest.spyOn(React, 'useRef').mockReturnValue(mockRef)
    }

    const longText =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur. Praesent porta condimentum imperdiet.'
    const shortText =
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi ut justo non nisl congue efficitur.'
    const clamped2Lines = {
        offsetWidth: 100,
        scrollWidth: 200,
        offsetHeight: 100,
        scrollHeight: 200,
        style: { webkitLineClamp: '2' },
    }
    const notClamped = {
        offsetWidth: 200,
        scrollWidth: 100,
        offsetHeight: 200,
        scrollHeight: 100,
        style: { webkitLineClamp: '2' },
    }

    it('renders without errors and clamps long text', () => {
        setMockRefElement(clamped2Lines)
        render(<ExpandableText clamp={longText} />)
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass('textContracted')
        expect(screen.getByText('Show More')).toBeInTheDocument()
    })

    it('can expand and contract clamped text to show more or less text', () => {
        setMockRefElement(clamped2Lines)
        render(<ExpandableText clamp={longText} />)
        expect(screen.getByText('Show More')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass('textContracted')
        userEvent.click(screen.getByText('Show More'))
        expect(screen.getByText('Show Less')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass('textExpanded')
    })

    it('renders short text without errors and not clamped', () => {
        setMockRefElement(notClamped)
        render(<ExpandableText clamp={shortText} />)
        expect(screen.queryByText('Show More')).toBeNull()
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass('textContracted')
    })

    it('can render react elements and clamp long text correctly', () => {
        setMockRefElement(clamped2Lines)
        render(
            <ExpandableText
                clamp={
                    <>
                        <span>Some header</span>
                        <span>longText</span>
                    </>
                }
            />
        )
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass('textContracted')
        expect(screen.getByText('Show More')).toBeInTheDocument()
    })

    it('can expand and contract clamped text inside react element to show more or less text', () => {
        setMockRefElement(clamped2Lines)
        render(
            <ExpandableText
                clamp={
                    <span>
                        <b>Some Styling</b>
                        {longText}
                    </span>
                }
            />
        )
        expect(screen.getByText('Show More')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass('textContracted')
        userEvent.click(screen.getByText('Show More'))
        expect(screen.getByText('Show Less')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass('textExpanded')
    })
})
