import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpandableText } from './ExpandableText'
import * as tealium from '../../hooks/useTealium'

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
        vi.spyOn(React, 'useRef').mockReturnValue(mockRef)
    }

    const spyOnUseTealium = vi.spyOn(tealium, 'useTealium')

    beforeEach(() => {
        spyOnUseTealium.mockImplementation(() => ({
            logButtonEvent: () => {
                return
            },
            logInternalLinkEvent: () => {
                return
            },
            logDropdownSelectionEvent: () => {
                return
            },
            logFilterEvent: () => {
                return
            },
        }))
    })

    afterEach(() => {
        vi.resetAllMocks()
    })

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
        render(
            <ExpandableText>
                <>{longText}</>
            </ExpandableText>
        )
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass(
            '_textContracted_a80648'
        )
        expect(screen.getByText('Show More')).toBeInTheDocument()
    })

    it('can expand and contract clamped text to show more or less text', async () => {
        setMockRefElement(clamped2Lines)
        render(
            <ExpandableText>
                <>{longText}</>
            </ExpandableText>
        )
        expect(screen.getByText('Show More')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass(
            '_textContracted_a80648'
        )
        await userEvent.click(screen.getByText('Show More'))
        expect(screen.getByText('Show Less')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass(
            '_textExpanded_a80648'
        )
    })

    it('renders short text without errors and not clamped', () => {
        setMockRefElement(notClamped)
        render(
            <ExpandableText>
                <>{shortText}</>
            </ExpandableText>
        )
        expect(screen.queryByText('Show More')).toBeNull()
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass(
            '_textContracted_a80648'
        )
    })

    it('can render react elements and clamp long text correctly', () => {
        setMockRefElement(clamped2Lines)
        render(
            <ExpandableText>
                <>
                    <span>Some header</span>
                    <span>longText</span>
                </>
            </ExpandableText>
        )
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass(
            '_textContracted_a80648'
        )
        expect(screen.getByText('Show More')).toBeInTheDocument()
    })

    it('can expand and contract clamped text inside react element to show more or less text', async () => {
        setMockRefElement(clamped2Lines)
        render(
            <ExpandableText>
                <span>
                    <b>Some Styling</b>
                    {longText}
                </span>
            </ExpandableText>
        )
        expect(screen.getByText('Show More')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass(
            '_textContracted_a80648'
        )
        await userEvent.click(screen.getByText('Show More'))
        expect(screen.getByText('Show Less')).toBeInTheDocument()
        expect(screen.getByTestId('clampElement')).toHaveClass(
            '_textExpanded_a80648'
        )
    })
})
